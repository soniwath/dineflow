"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
} from "@/lib/api/notifications";
import type { Notification } from "@/types/Notification";

export function useNotifications({
  intervalMs = 5000,
  enabled = true,
}: { intervalMs?: number; enabled?: boolean } = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return; // skip if the last request is still running
    inFlight.current = true;
    try {
      const data = await getNotificationsApi();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    refresh();

    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick); // catch up on tab focus

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, intervalMs, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationAsReadApi(id);
      } catch (err) {
        console.error(err);
      } finally {
        refresh(); // resync with the server either way
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
    setUnreadCount(0);
    try {
      await markAllNotificationsAsReadApi();
    } catch (err) {
      console.error(err);
    } finally {
      refresh();
    }
  }, [refresh]);

  const loadMoreNotifications = useCallback(async () => {
    try {
      const data = await getNotificationsApi({
        limit: notifications.length + 10,
      });
      setNotifications([...data.notifications]);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Failed to load more notifications", err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    refresh,
    loadMoreNotifications,
  };
}
