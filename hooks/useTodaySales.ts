"use client";

import { useCallback, useEffect, useState } from "react";
import { getAnalyticsApi } from "@/lib/api/analytics";
import type { AnalyticsData } from "@/types/Analytics";
import { getRestaurantDate } from "@/lib/scheduling";

export function useTodaySales() {
  const [today, setToday] = useState(() =>
    getRestaurantDate(new Date().toISOString()),
  );
  const [refreshCount, setRefreshCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: AnalyticsData | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  const requestKey = `${today}:${refreshCount}`;
  const loading = result.key !== requestKey;

  // Roll over at midnight (restaurant time)
  useEffect(() => {
    const updateDate = () =>
      setToday(getRestaurantDate(new Date().toISOString()));
    const initialTick = window.setTimeout(updateDate, 0);
    const interval = window.setInterval(updateDate, 30_000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(interval);
    };
  }, []);

  // Fetch "Today" analytics
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    // "Today" shouldn't need a custom range, but the signature still takes one
    const dates = { startDate: today, endDate: today };

    void getAnalyticsApi("Today", dates, controller.signal).then(
      (data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: null });
      },
      (cause: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Could not load today's sales.",
          });
        }
      },
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [today, requestKey]);

  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);

  return {
    data: loading ? null : result.data,
    error: loading ? null : result.error,
    loading,
    refresh,
  };
}
