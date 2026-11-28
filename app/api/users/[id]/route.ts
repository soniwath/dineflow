import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
const bcrypt = require("bcrypt");
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { UpdateUserBody } from "@/types/User";
import { isAuthenticated } from "@/lib/auth/jwt";
import { USERS_CACHE_TAG } from "@/app/api/users/route";
import { SCHEDULING_CACHE_TAG } from "@/app/api/scheduling/route";

function sanitizeUser(row: typeof users.$inferSelect) {
  // Remove sensitive fields like passwordHash before returning the user object
  const { passwordHash, ...safe } = row;
  return safe;
}

const getCachedUserById = (id: string) =>
  unstable_cache(
    async () => {
      const row = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return row[0] ? sanitizeUser(row[0]) : null;
    },
    ["user-by-id", id],
    { tags: [USERS_CACHE_TAG, `user-${id}`], revalidate: 60 },
  )();

export async function GET(
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
  const user = await getCachedUserById(id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as UpdateUserBody;
    const { id } = await params;

    const updateData: Partial<typeof users.$inferInsert> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.email !== undefined)
      updateData.email = body.email.trim().toLowerCase();
    if (body.roleId !== undefined) updateData.roleId = body.roleId;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.lastLoginAt !== undefined) {
      updateData.lastLoginAt = body.lastLoginAt
        ? new Date(body.lastLoginAt)
        : null;
    }
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const updated = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    revalidateTag(USERS_CACHE_TAG, { expire: 0 });
    revalidateTag(`user-${id}`, { expire: 0 });
    revalidateTag(SCHEDULING_CACHE_TAG, { expire: 0 });

    return NextResponse.json(sanitizeUser(updated[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
  // Soft delete: isActive = false
  const updated = await db
    .update(users)
    .set({ isActive: false })
    .where(eq(users.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  revalidateTag(USERS_CACHE_TAG, { expire: 0 });
  revalidateTag(`user-${id}`, { expire: 0 });
  revalidateTag(SCHEDULING_CACHE_TAG, { expire: 0 });

  return NextResponse.json({ success: true });
}
