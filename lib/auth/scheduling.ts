import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import { users, userRoles } from "@/lib/db/schema";

export class SchedulingAccessError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "SchedulingAccessError";
  }
}

export async function requireSchedulingUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (typeof payload?.id !== "string") {
    throw new SchedulingAccessError(401, "Please log in");
  }

  const [user] = await db
    .select({
      id: users.id,
      roleId: users.roleId,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, payload.id))
    .limit(1);

  if (!user || !user.isActive) {
    throw new SchedulingAccessError(401, "Please log in");
  }

  return user;
}

export async function requireSchedulingManager() {
  const user = await requireSchedulingUser();

  // Get user role
  const [userRole] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.id, String(user.roleId)))
    .limit(1);

  const roleName = userRole?.name ?? "";

  if (roleName !== "Manager" && roleName !== "Owner") {
    throw new SchedulingAccessError(
      403,
      "Only managers and owners can manage scheduling",
    );
  }

  return user;
}
