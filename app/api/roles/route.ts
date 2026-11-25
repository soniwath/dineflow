import { NextResponse } from "next/server";

import { db } from "@/lib/db/index";
import { userRoles } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth/jwt";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rows = await db
    .select({
      id: userRoles.id,
      name: userRoles.name,
      description: userRoles.description,
    })
    .from(userRoles)
    .orderBy(userRoles.name);

  return NextResponse.json(rows);
}
