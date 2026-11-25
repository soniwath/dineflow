export type Notification = {
  id: string;
  type: NotificationType;
  status: "read" | "unread";
  title: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationType =
  | "order_update"
  | "reservation_update"
  | "inventory_alert";
