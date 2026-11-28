import { Notification, NotificationType } from "@/types/Notification";

export async function getNotificationsApi(params?: any): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const { limit } = params || { limit: 10 };
  const res = await fetch(`/api/notifications?limit=${limit}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch notifications");

  return data;
}

export async function createNotificationApi(input: {
  title: string;
  message: string;
  type: NotificationType;
}): Promise<Notification> {
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create notification");
  return data.notification as Notification;
}

export async function markNotificationAsReadApi(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
  });

  if (!res.ok) throw new Error("Failed to mark notification as read");
}

export async function markAllNotificationsAsReadApi(): Promise<void> {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
  });

  if (!res.ok) throw new Error("Failed to mark all notifications as read");
}
