ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "notification_type";--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('order_update', 'order_cancelled', 'reservation_update', 'reservation_cancelled', 'inventory_alert', 'low_stock_alert', 'out_of_stock_alert');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "notification_type" USING "type"::"notification_type";