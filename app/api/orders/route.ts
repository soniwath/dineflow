import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db/index";
import {
  orders,
  orderItems,
  menuItems,
  menuInventoryItems,
  inventoryItems,
  billPaymentOrders,
  notifications,
} from "@/lib/db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getCancellationBlockReason } from "@/lib/db/order-cancellation";
import type { OrderInventoryDeduction } from "@/types/Order";
import type { NotificationType } from "@/types/Notification";
import { INVENTORY_CACHE_TAG } from "@/app/api/inventory-items/route";

export const ORDERS_CACHE_TAG = "orders";
export const MENU_CACHE_TAG = "menu";

// Cached DB queries (shared across all users/requests on the server)
const getCachedMenu = unstable_cache(
  async () => db.select().from(menuItems),
  ["orders-route-menu"],
  { tags: [MENU_CACHE_TAG], revalidate: 300 }, // Revalidates every 5 mins or on menu mutation
);

const getCachedOrders = unstable_cache(
  async () => {
    console.log("DB QUERY (CACHE MISS): orders");

    const allOrders = await db
      .select({ order: orders, paidOrderId: billPaymentOrders.orderId })
      .from(orders)
      .leftJoin(billPaymentOrders, eq(billPaymentOrders.orderId, orders.id))
      .orderBy(desc(orders.createdAt));

    if (allOrders.length === 0) return [];

    // Single batched query instead of N+1 queries per order
    const orderIds = allOrders.map(({ order }) => order.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const itemsByOrderId = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrderId.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrderId.set(item.orderId, list);
    }

    return allOrders.map(({ order, paidOrderId }) => {
      const cancellationBlockReason = getCancellationBlockReason(
        order,
        paidOrderId !== null,
      );
      return {
        ...order,
        items: itemsByOrderId.get(order.id) ?? [],
        canCancel: cancellationBlockReason === null,
        cancellationBlockReason,
      };
    });
  },
  ["orders-route-list"],
  { tags: [ORDERS_CACHE_TAG], revalidate: 60 }, // Fallback TTL of 60s; immediately purged on writes
);

export async function GET() {
  try {
    const [allMenuItems, ordersWithItems] = await Promise.all([
      getCachedMenu(),
      getCachedOrders(),
    ]);

    return NextResponse.json(
      {
        success: true,
        menu: allMenuItems,
        orders: ordersWithItems,
      },
      {
        headers: {
          // Ensure browsers/proxies always check with Next.js rather than serving stale HTTP cache
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 },
    );
  }
}

class InvalidOrderError extends Error {}

export async function POST(request: Request) {
  try {
    const alerts: { title: string; message: string; type: NotificationType }[] =
      [];
    const body = await request.json().catch(() => null);
    const tableNumber = Number(body?.tableNumber);
    if (
      !Number.isInteger(tableNumber) ||
      tableNumber < 1 ||
      tableNumber > 2147483647 ||
      !Array.isArray(body?.items) ||
      body.items.length === 0
    ) {
      throw new InvalidOrderError(
        "A valid table number and items are required",
      );
    }
    const items: { menuItemId: string; quantity: number }[] = body.items.map(
      (item: unknown) => {
        if (
          !item ||
          typeof item !== "object" ||
          !("menuItemId" in item) ||
          !("quantity" in item) ||
          typeof item.menuItemId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            item.menuItemId,
          ) ||
          typeof item.quantity !== "number" ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 2147483647
        ) {
          throw new InvalidOrderError(
            "Each order item needs a valid menu ID and positive quantity",
          );
        }
        return { menuItemId: item.menuItemId, quantity: item.quantity };
      },
    );
    const menuIds = [...new Set(items.map((item) => item.menuItemId))];
    const newOrder = await db.transaction(async (tx) => {
      const catalog = await tx
        .select({ id: menuItems.id, price: menuItems.price })
        .from(menuItems)
        .where(inArray(menuItems.id, menuIds));
      const prices = new Map(catalog.map((item) => [item.id, item.price]));
      if (menuIds.some((id) => !prices.has(id))) {
        throw new InvalidOrderError(
          "One or more menu items are no longer available",
        );
      }
      const [order] = await tx
        .insert(orders)
        .values({ tableNumber, status: "pending", inventoryDeductions: [] })
        .returning();
      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: prices.get(item.menuItemId)!,
        })),
      );

      const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
      alerts.push({
        title: `New order · Table ${tableNumber}`,
        message: `${itemCount} ${itemCount === 1 ? "item" : "items"} sent to the kitchen.`,
        type: "order_update",
      });

      const quantities = new Map<string, number>();
      for (const item of items) {
        quantities.set(
          item.menuItemId,
          (quantities.get(item.menuItemId) ?? 0) + item.quantity,
        );
      }
      const recipes = await tx
        .select()
        .from(menuInventoryItems)
        .where(inArray(menuInventoryItems.menuItemId, menuIds));
      const deductions = new Map<string, number>();
      for (const recipe of recipes) {
        if (
          !Number.isFinite(recipe.quantityRequired) ||
          recipe.quantityRequired < 0
        ) {
          throw new InvalidOrderError(
            "A menu item's ingredient quantities need review.",
          );
        }
        deductions.set(
          recipe.inventoryItemId,
          (deductions.get(recipe.inventoryItemId) ?? 0) +
            recipe.quantityRequired * quantities.get(recipe.menuItemId)!,
        );
      }
      const inventoryDeductions: OrderInventoryDeduction[] = [];
      for (const [id, quantity] of [...deductions].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        if (quantity === 0) continue;
        const [before] = await tx
          .select({
            onHand: inventoryItems.onHand,
            lowAt: inventoryItems.lowAt,
            name: inventoryItems.name,
            unit: inventoryItems.unit,
          })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, id))
          .limit(1)
          .for("update");
        if (!before || !Number.isFinite(before.onHand) || before.onHand < 0) {
          throw new InvalidOrderError(
            "An ingredient's stock level needs review.",
          );
        }
        const [after] = await tx
          .update(inventoryItems)
          .set({
            onHand: sql`GREATEST(0, ${inventoryItems.onHand} - ${quantity})`,
          })
          .where(eq(inventoryItems.id, id))
          .returning({ onHand: inventoryItems.onHand });

        const actualDeduction = before.onHand - after.onHand;
        if (actualDeduction > 0) {
          inventoryDeductions.push({
            inventoryItemId: id,
            quantity: actualDeduction,
          });
        }

        const justRanOut = before.onHand > 0 && after.onHand === 0;
        const justWentLow =
          before.onHand > before.lowAt && after.onHand <= before.lowAt;

        if (justRanOut) {
          alerts.push({
            title: `${before.name} is out of stock`,
            message: `${before.name} has run out. Restock as soon as possible.`,
            type: "out_of_stock_alert",
          });
        } else if (justWentLow) {
          alerts.push({
            title: `Low stock: ${before.name}`,
            message: `${before.name} is down to ${after.onHand} ${before.unit} (threshold: ${before.lowAt}).`,
            type: "low_stock_alert",
          });
        }
      }

      if (alerts.length > 0) {
        await tx.insert(notifications).values(alerts);
      }

      const [saved] = await tx
        .update(orders)
        .set({ inventoryDeductions })
        .where(eq(orders.id, order.id))
        .returning();

      return saved;
    });

    // Revalidate server cache immediately after transaction commits
    revalidateTag(ORDERS_CACHE_TAG, { expire: 0 });
    revalidateTag(INVENTORY_CACHE_TAG, { expire: 0 });
    // revalidateTag("notifications");

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    if (error instanceof InvalidOrderError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }
    console.error("Failed to create order", error);
    return NextResponse.json(
      { success: false, message: "Failed to create order" },
      { status: 500 },
    );
  }
}
