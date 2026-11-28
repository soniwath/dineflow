import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth/jwt";

// Mark one as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const [updated] = await db
    .update(notifications)
    .set({ status: "read" })
    .where(eq(notifications.id, id))
    .returning({ id: notifications.id });

  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
