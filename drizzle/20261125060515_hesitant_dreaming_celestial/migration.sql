CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" ADD COLUMN "role_id" uuid;
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL;
DROP TYPE "user_role";
