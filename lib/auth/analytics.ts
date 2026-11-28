import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import { users, userRoles } from "@/lib/db/schema";

export class AnalyticsAccessError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AnalyticsAccessError";
  }
}

export async function requireAnalyticsManager() {
  const token = (await cookies()).get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (typeof payload?.id !== "string") {
    throw new AnalyticsAccessError(401, "Please sign in to view Analytics.");
  }

  const [user] = await db
    .select({ id: users.id, roleId: users.roleId, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.id))
    .limit(1);

  let roleName;
  if (user) {
    const [userRole] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.id, String(user.roleId)))
      .limit(1);

    if (!userRole) {
      throw new AnalyticsAccessError(
        403,
        "User role not found. Please contact support.",
      );
    }

    roleName = userRole?.name;
  }
  // console.log(userRole);

  if (!user?.isActive) {
    throw new AnalyticsAccessError(401, "Please sign in to view Analytics.");
  }
  if (roleName !== "Manager" && roleName !== "Owner") {
    throw new AnalyticsAccessError(
      403,
      "Only managers and owners can view Analytics.",
    );
  }
  return user;
}
