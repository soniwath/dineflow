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
  | "order_cancelled"
  | "reservation_update"
  | "reservation_cancelled"
  | "inventory_alert"
  | "low_stock_alert"
  | "out_of_stock_alert";
