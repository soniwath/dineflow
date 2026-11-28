import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db/index";
import { reservations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth/jwt";

export const RESERVATIONS_CACHE_TAG = "reservations";

const getCachedReservations = unstable_cache(
  async () => db.select().from(reservations),
  ["reservations-route"],
  { tags: [RESERVATIONS_CACHE_TAG], revalidate: 300 }, // Revalidates every 5 mins or on reservation mutation
);

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const allReservations = await getCachedReservations();

    return NextResponse.json({ success: true, reservations: allReservations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
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
    const body = await request.json();
    const { name, phone, party, date, time, notes } = body;

    // Use db transactions
    const newRes = await db.transaction(async (tx) => {
      const [reservation] = await tx
        .insert(reservations)
        .values({
          name,
          phone: phone || "",
          party: Number(party),
          date,
          time,
          notes: notes || "",
          status: "booked",
          tableId: null,
        })
        .returning();

      return reservation;
    });

    // Revalidate only AFTER the transaction has committed
    revalidateTag(RESERVATIONS_CACHE_TAG, { expire: 0 });

    return NextResponse.json({ success: true, reservation: newRes });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
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
    const body = await request.json();
    const { id, ...patch } = body;

    if (!id)
      return NextResponse.json(
        { success: false, error: "ID required" },
        { status: 400 },
      );

    const updateData: Record<string, any> = { updatedAt: sql`NOW()` };
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.phone !== undefined) updateData.phone = patch.phone;
    if (patch.party !== undefined) updateData.party = Number(patch.party);
    if (patch.date !== undefined) updateData.date = patch.date;
    if (patch.time !== undefined) updateData.time = patch.time;
    if (patch.notes !== undefined) updateData.notes = patch.notes;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.tableId !== undefined) updateData.tableId = patch.tableId;

    // Use db transaction
    const updated = await db.transaction(async (tx) => {
      const [reservation] = await tx
        .update(reservations)
        .set(updateData)
        .where(eq(reservations.id, id))
        .returning();

      return reservation;
    });

    // Revalidate only AFTER the transaction has committed
    revalidateTag(RESERVATIONS_CACHE_TAG, { expire: 0 });

    return NextResponse.json({ success: true, reservation: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
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
    if (!id)
      return NextResponse.json(
        { success: false, error: "ID required" },
        { status: 400 },
      );

    await db.delete(reservations).where(eq(reservations.id, id));

    // Revalidate only AFTER the delete
    revalidateTag(RESERVATIONS_CACHE_TAG, { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
