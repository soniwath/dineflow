CREATE TYPE "notification_status" AS ENUM('unread', 'read');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('order_update', 'reservation_update', 'inventory_alert');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"status" "notification_status" DEFAULT 'unread'::"notification_status" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
