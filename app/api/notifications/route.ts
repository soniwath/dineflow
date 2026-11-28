import { NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { notifications, notificationTypeEnum } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth/jwt";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 20, 1),
    100,
  );

  const where =
    status === "unread" || status === "read"
      ? eq(notifications.status, status)
      : undefined;

  const [rows, [unread]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({ value: count() })
      .from(notifications)
      .where(eq(notifications.status, "unread")),
  ]);

  return NextResponse.json({
    notifications: rows,
    unreadCount: unread?.value ?? 0,
  });
}

// Create new notification
export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const type = body?.type;

  const errors: Record<string, string> = {};

  if (!title) errors.title = "Title is required.";
  else if (title.length > 255)
    errors.title = "Title must be 255 characters or fewer.";

  if (!message) errors.message = "Message is required.";

  if (!notificationTypeEnum.enumValues.includes(type))
    errors.type = "Invalid notification type.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  const [created] = await db
    .insert(notifications)
    .values({ title, message, type })
    .returning();

  return NextResponse.json(
    { success: true, notification: created },
    { status: 201 },
  );
}

// Mark all as read
export async function PATCH() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await db
    .update(notifications)
    .set({ status: "read" })
    .where(eq(notifications.status, "unread"));

  return NextResponse.json({ success: true });
}
