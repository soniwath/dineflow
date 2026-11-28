import { db } from "@/lib/db/index";
import { users, userRoles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
const bcrypt = require("bcrypt");

export async function seedUsers() {
  console.log("🌱 Seeding users...");

  const saltRounds = 10;
  const staffPasswordHash = await bcrypt.hash("staff123", saltRounds);
  const managerPasswordHash = await bcrypt.hash("manager123", saltRounds);
  const ownerPasswordHash = await bcrypt.hash("owner123", saltRounds);

  const seedUsers = [
    {
      name: "Sokha",
      email: "staff@dineflow.test",
      roleId: "", // Will be set later
      passwordHash: staffPasswordHash,
      isActive: true,
    },
    {
      name: "Dara",
      email: "manager@dineflow.test",
      roleId: "", // Will be set later
      passwordHash: managerPasswordHash,
      isActive: true,
    },
    {
      name: "Huyming",
      email: "owner@dineflow.test",
      roleId: "", // Will be set later
      passwordHash: ownerPasswordHash,
      isActive: true,
    },
  ];

  for (const user of seedUsers) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, user.email.toLowerCase()))
      .limit(1);

    if (!existing) {
      // insert role_id to each user
      let roleId = "";
      if (user.email.startsWith("owner")) {
        const [ownerRole] = await db
          .select()
          .from(userRoles)
          .where(eq(sql`lower(${userRoles.name})`, "owner"))
          .limit(1);
        roleId = ownerRole?.id;
      } else if (user.email.startsWith("manager")) {
        const [managerRole] = await db
          .select()
          .from(userRoles)
          .where(eq(sql`lower(${userRoles.name})`, "manager"))
          .limit(1);
        roleId = managerRole?.id;
      } else if (user.email.startsWith("staff")) {
        const [staffRole] = await db
          .select()
          .from(userRoles)
          .where(eq(sql`lower(${userRoles.name})`, "staff"))
          .limit(1);
        roleId = staffRole?.id;
      }

      user.roleId = roleId;
      await db.insert(users).values(user);
    }
  }
  console.log("✅ Users seeded.");
}
