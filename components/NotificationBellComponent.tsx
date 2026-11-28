"use client";
import { Bell, Package, CalendarClock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/AuthStore";
import { useNotifications } from "@/hooks/useNotification";
import type { NotificationType } from "@/types/Notification";

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; className: string }
> = {
  order_update: { icon: Package, className: "bg-cyan-500/15 text-cyan-600" },
  order_cancelled: {
    icon: Package,
    className: "bg-rose-500/15 text-rose-600",
  },
  reservation_update: {
    icon: CalendarClock,
    className: "bg-violet-500/15 text-violet-600",
  },
  reservation_cancelled: {
    icon: CalendarClock,
    className: "bg-rose-500/15 text-rose-600",
  },
  inventory_alert: {
    icon: AlertTriangle,
    className: "bg-amber-500/15 text-amber-600",
  },
  low_stock_alert: {
    icon: AlertTriangle,
    className: "bg-amber-500/15 text-amber-600",
  },
  out_of_stock_alert: {
    icon: AlertTriangle,
    className: "bg-rose-500/15 text-rose-600",
  },
};

function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs)
      return rtf.format(Math.round(diff / secs), unit);
  }
  return "just now";
}

export default function NotificationBell() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    loadMoreNotifications,
  } = useNotifications({
    intervalMs: 5000,
    enabled: !!user && user.role !== "guest",
  });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative"
            aria-label={`Notifications, ${unreadCount} unread`}
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-120 max-h-96 p-0 overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            notifications.map((n) => {
              const { icon: Icon, className } = TYPE_META[n.type];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => n.status === "unread" && markRead(n.id)}
                  className={cn(
                    "flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-muted/50",
                    n.status === "unread" && "bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      className,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {n.status === "unread" && (
                        <span className="size-2 shrink-0 rounded-full bg-red-500" />
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t px-4 py-3 text-center">
          <Button size="sm" onClick={loadMoreNotifications}>
            Load more
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
