import { NextResponse } from "next/server";
import { or, and, eq, ilike, SQL } from "drizzle-orm";
const bcrypt = require("bcrypt");

import { db } from "@/lib/db/index";
import { users, userRoles } from "@/lib/db/schema";
import { CreateUserBody } from "@/types/User";
import { isAuthenticated } from "@/lib/auth/jwt";

function sanitizeUser(row: any) {
  const { passwordHash, ...safe } = row;
  return safe;
}

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());
  const { q, roleId, status } = params;

  const conditions: any = [];

  if (q) {
    conditions.push(
      or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)),
    );
  }

  if (status) {
    const isActive = status === "active";
    conditions.push(eq(users.isActive, isActive));
  } else {
    conditions.push(eq(users.isActive, true));
  }

  if (roleId) {
    conditions.push(eq(users.roleId, roleId));
  }

  // 2. Execute the query with all active conditions
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      role: userRoles.name,
      roleId: userRoles.id,
    })
    .from(users)
    .leftJoin(userRoles, eq(users.roleId, userRoles.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(users.createdAt);

  return NextResponse.json(rows.map(sanitizeUser));
}

export async function POST(req: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as Partial<CreateUserBody>;

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(body.password, 12);

    const inserted = await db
      .insert(users)
      .values({
        name: body.name.trim(),
        email,
        passwordHash,
        roleId: body.roleId,
        isActive: body.isActive ?? true,
      })
      .returning();

    return NextResponse.json(sanitizeUser(inserted[0]), { status: 201 });
  } catch (error: any) {
    console.log(error);
    // Postgres unique violation
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
