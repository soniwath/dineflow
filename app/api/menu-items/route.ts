import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db/index";
import { menuItems, menuInventoryItems } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth/jwt";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { saveImage } from "@/lib/save-image";

export const MENU_CACHE_TAG = "menu";

const getCachedMenuPage = unstable_cache(
  async (
    page: number | null,
    pageSize: number,
    q?: string,
    categories?: string[],
  ) => {
    const conditions = [];

    if (q) {
      conditions.push(
        or(
          ilike(menuItems.name, `%${q}%`),
          ilike(menuItems.category, `%${q}%`),
        ),
      );
    }

    if (categories && categories.length > 0) {
      conditions.push(inArray(menuItems.category, categories));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [[{ total }], [{ totalAll }]] = await Promise.all([
      db.select({ total: count() }).from(menuItems).where(whereClause),
      db.select({ totalAll: count() }).from(menuItems),
    ]);

    const baseQuery = db
      .select()
      .from(menuItems)
      .where(whereClause)
      .orderBy(asc(menuItems.name));

    const rows =
      page !== null
        ? await baseQuery.limit(pageSize).offset((page - 1) * pageSize)
        : await baseQuery;

    // Single batched query instead of N+1 queries per menu item
    const ids = rows.map((m) => m.id);
    const recipes =
      ids.length > 0
        ? await db
            .select()
            .from(menuInventoryItems)
            .where(inArray(menuInventoryItems.menuItemId, ids))
        : [];

    const recipesByMenuId = new Map<string, typeof recipes>();
    for (const r of recipes) {
      const list = recipesByMenuId.get(r.menuItemId) ?? [];
      list.push(r);
      recipesByMenuId.set(r.menuItemId, list);
    }

    const items = rows.map((menuItem) => ({
      ...menuItem,
      ingredients: recipesByMenuId.get(menuItem.id) ?? [],
    }));

    return { items, total, totalAll };
  },
  ["menu-items-paginated"],
  { tags: [MENU_CACHE_TAG], revalidate: 60 },
);

function parseIngredientsField(
  raw: FormDataEntryValue | undefined,
): Array<{ inventoryItemId: string; quantityRequired: number }> {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const page = pageParam ? Math.max(1, Number(pageParam) || 1) : null;
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize")) || 10),
    );
    const q = searchParams.get("q")?.trim() || undefined;
    const categories = searchParams.getAll("category").filter(Boolean);

    const result = await getCachedMenuPage(page, pageSize, q, categories);

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    formData.delete("image");

    const body = Object.fromEntries(formData.entries());
    const name = String(body.name ?? "");
    const price = Number(body.price ?? 0);
    const desc = body.desc ? String(body.desc) : null;
    const category = String(body.category ?? "Starters");
    const ingredients = parseIngredientsField(body.ingredients);

    let imageUrl: string | null = null;
    if (file instanceof File && file.size > 0) {
      imageUrl = await saveImage(file);
    }

    const resultItem = await db.transaction(async (tx) => {
      const [item] = await tx
        .insert(menuItems)
        .values({
          name,
          price,
          image: imageUrl,
          desc,
          category,
        })
        .returning();

      if (ingredients.length > 0) {
        await tx.insert(menuInventoryItems).values(
          ingredients.map((ing) => ({
            menuItemId: item.id,
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: Number(ing.quantityRequired) || 0,
          })),
        );
      }

      return item;
    });

    revalidateTag(MENU_CACHE_TAG, { expire: 0 });

    const savedIngredients = await db
      .select()
      .from(menuInventoryItems)
      .where(eq(menuInventoryItems.menuItemId, resultItem.id));

    return NextResponse.json({
      success: true,
      item: { ...resultItem, ingredients: savedIngredients },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create menu item",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    formData.delete("image");

    const body = Object.fromEntries(formData.entries());
    const id = String(body.id ?? "");
    const name = String(body.name ?? "");
    const price = Number(body.price ?? 0);
    const desc = body.desc ? String(body.desc) : null;
    const category = String(body.category ?? "Starters");
    const ingredients = parseIngredientsField(body.ingredients);

    let imageUrl: string | undefined;
    if (file instanceof File && file.size > 0) {
      imageUrl = await saveImage(file);
    }

    const resultItem = await db.transaction(async (tx) => {
      const [item] = await tx
        .update(menuItems)
        .set({
          name,
          price,
          ...(imageUrl !== undefined ? { image: imageUrl } : {}),
          desc,
          category,
          updatedAt: sql`NOW()`,
        })
        .where(eq(menuItems.id, id))
        .returning();

      if (!item) {
        throw new Error("Menu item not found");
      }

      await tx
        .delete(menuInventoryItems)
        .where(eq(menuInventoryItems.menuItemId, id));

      if (ingredients.length > 0) {
        await tx.insert(menuInventoryItems).values(
          ingredients.map((ing) => ({
            menuItemId: id,
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: Number(ing.quantityRequired) || 0,
          })),
        );
      }

      return item;
    });

    revalidateTag(MENU_CACHE_TAG, { expire: 0 });

    const savedIngredients = await db
      .select()
      .from(menuInventoryItems)
      .where(eq(menuInventoryItems.menuItemId, id));

    return NextResponse.json({
      success: true,
      item: { ...resultItem, ingredients: savedIngredients },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update menu item",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Menu item ID is required" },
        { status: 400 },
      );
    }

    await db.delete(menuItems).where(eq(menuItems.id, id));

    revalidateTag(MENU_CACHE_TAG, { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete menu item",
      },
      { status: 500 },
    );
  }
}
