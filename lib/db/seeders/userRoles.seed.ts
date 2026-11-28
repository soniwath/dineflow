import { db } from "@/lib/db/index";
import { userRoles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function seedUserRoles() {
  console.log("🌱 Seeding user roles...");

  const seedUserRoles = [
    {
      name: "Owner",
      description:
        "Has full access to the system and can manage all aspects of the restaurant.",
    },
    {
      name: "Manager",
      description:
        "Can manage staff, view reports, and oversee restaurant operations.",
    },
    {
      name: "Staff",
      description: "Can take orders, manage tables, and assist customers.",
    },
  ];

  for (const role of seedUserRoles) {
    const [existing] = await db
      .select()
      .from(userRoles)
      .where(eq(sql`lower(${userRoles.name})`, role.name.toLowerCase()))
      .limit(1);

    if (!existing) {
      await db.insert(userRoles).values(role);
    }
  }

  console.log("✅ User roles seeded.");
}
