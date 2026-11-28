import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db/index";
import { inventoryItems, suppliers } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth/jwt";
import { and, asc, count, eq, gt, ilike, inArray, lte, or } from "drizzle-orm";

export const INVENTORY_CACHE_TAG = "inventory";

const getCachedInventoryPage = unstable_cache(
  async (
    page: number | null,
    pageSize: number,
    q: string,
    statusesKey: string,
    supplierIdsKey: string,
  ) => {
    const statuses = statusesKey ? statusesKey.split(",") : [];
    const supplierIds = supplierIdsKey ? supplierIdsKey.split(",") : [];
    const conditions = [];

    if (q) {
      conditions.push(
        or(
          ilike(inventoryItems.name, `%${q}%`),
          ilike(suppliers.name, `%${q}%`),
        ),
      );
    }

    if (supplierIds.length > 0) {
      conditions.push(inArray(inventoryItems.supplierId, supplierIds));
    }

    if (statuses.length > 0) {
      const statusClauses = [];
      if (statuses.includes("out")) {
        statusClauses.push(lte(inventoryItems.onHand, 0));
      }
      if (statuses.includes("low")) {
        statusClauses.push(
          and(
            gt(inventoryItems.onHand, 0),
            lte(inventoryItems.onHand, inventoryItems.lowAt),
          ),
        );
      }
      if (statuses.includes("at-par")) {
        statusClauses.push(gt(inventoryItems.onHand, inventoryItems.lowAt));
      }
      if (statusClauses.length > 0) {
        conditions.push(or(...statusClauses));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [[{ total }], allForFacets] = await Promise.all([
      db
        .select({ total: count() })
        .from(inventoryItems)
        .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
        .where(whereClause),
      db
        .select({
          onHand: inventoryItems.onHand,
          lowAt: inventoryItems.lowAt,
          supplierId: inventoryItems.supplierId,
        })
        .from(inventoryItems),
    ]);

    const statusCounts = { "at-par": 0, low: 0, out: 0 };
    const supplierCounts: Record<string, number> = {};
    for (const row of allForFacets) {
      if (row.onHand <= 0) statusCounts.out++;
      else if (row.onHand <= row.lowAt) statusCounts.low++;
      else statusCounts["at-par"]++;

      if (row.supplierId) {
        supplierCounts[row.supplierId] =
          (supplierCounts[row.supplierId] ?? 0) + 1;
      }
    }

    const baseQuery = db
      .select({ item: inventoryItems })
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.supplierId, suppliers.id))
      .where(whereClause)
      .orderBy(asc(inventoryItems.name));

    const rows =
      page !== null
        ? await baseQuery.limit(pageSize).offset((page - 1) * pageSize)
        : await baseQuery;

    return {
      items: rows.map((r) => r.item),
      total,
      totalAll: allForFacets.length,
      statusCounts,
      supplierCounts,
    };
  },
  ["inventory-items-paginated"],
  { tags: [INVENTORY_CACHE_TAG], revalidate: 60 },
);

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
    const q = searchParams.get("q")?.trim() ?? "";
    const statusesKey = [
      ...new Set(searchParams.getAll("status").filter(Boolean)),
    ]
      .sort()
      .join(",");
    const supplierIdsKey = [
      ...new Set(searchParams.getAll("supplierId").filter(Boolean)),
    ]
      .sort()
      .join(",");

    const result = await getCachedInventoryPage(
      page,
      pageSize,
      q,
      statusesKey,
      supplierIdsKey,
    );

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch inventory",
      },
      { status: 500 },
    );
  }
}
