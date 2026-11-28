import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db/index";
import { suppliers } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth/jwt";
import { asc, count, eq, ilike, or } from "drizzle-orm";

export const SUPPLIERS_CACHE_TAG = "suppliers";

const getCachedSuppliersPage = unstable_cache(
  async (page: number | null, pageSize: number, q?: string) => {
    const whereClause = q
      ? or(
          ilike(suppliers.name, `%${q}%`),
          ilike(suppliers.email, `%${q}%`),
          ilike(suppliers.phone, `%${q}%`),
        )
      : undefined;

    const [[{ total }], [{ totalAll }]] = await Promise.all([
      db.select({ total: count() }).from(suppliers).where(whereClause),
      db.select({ totalAll: count() }).from(suppliers),
    ]);

    const baseQuery = db
      .select()
      .from(suppliers)
      .where(whereClause)
      .orderBy(asc(suppliers.name));

    const rows =
      page !== null
        ? await baseQuery.limit(pageSize).offset((page - 1) * pageSize)
        : await baseQuery;

    return { suppliers: rows, total, totalAll };
  },
  ["suppliers-paginated"],
  { tags: [SUPPLIERS_CACHE_TAG], revalidate: 60 },
);

function invalidateSupplierCaches() {
  revalidateTag(SUPPLIERS_CACHE_TAG, { expire: 0 });
  // Inventory items join supplier names for search/display
  revalidateTag("inventory", { expire: 0 });
}

// GET /api/suppliers - List suppliers (paginated + searchable, or full list when page is omitted)
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

    const result = await getCachedSuppliersPage(page, pageSize, q);

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch suppliers" },
      { status: 500 },
    );
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Supplier name is required" },
        { status: 400 },
      );
    }

    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: name.trim(),
        email: typeof email === "string" ? email.trim() : email,
        phone: typeof phone === "string" ? phone.trim() : phone,
      })
      .returning();

    invalidateSupplierCaches();

    return NextResponse.json({ success: true, supplier: newSupplier });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create supplier" },
      { status: 500 },
    );
  }
}

// PUT /api/suppliers - Update an existing supplier
export async function PUT(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { id, name, email, phone } = body;

    if (!id || !name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Supplier ID and name are required" },
        { status: 400 },
      );
    }

    const updateData: { name: string; email?: string; phone?: string } = {
      name: name.trim(),
    };
    if (email !== undefined) {
      updateData.email = typeof email === "string" ? email.trim() : email;
    }
    if (phone !== undefined) {
      updateData.phone = typeof phone === "string" ? phone.trim() : phone;
    }

    const [updatedSupplier] = await db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, id))
      .returning();

    if (!updatedSupplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 },
      );
    }

    invalidateSupplierCaches();

    return NextResponse.json({ success: true, supplier: updatedSupplier });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update supplier" },
      { status: 500 },
    );
  }
}

// DELETE /api/suppliers?id=[supplierId] - Delete a supplier
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
        { success: false, error: "Supplier ID is required" },
        { status: 400 },
      );
    }

    await db.delete(suppliers).where(eq(suppliers.id, id));

    invalidateSupplierCaches();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete supplier" },
      { status: 500 },
    );
  }
}
