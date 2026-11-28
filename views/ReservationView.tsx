"use client";
import { useEffect, useState } from "react";
import { todayISO, useReservations } from "@/stores/ReservationStore";

import ReservationsBoardComponent from "@/components/reservation/ReservationsBoardComponent";
import ReservationsSkeleton from "@/components/reservation/ReservationsSkeleton";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function ReservationsView() {
  const { loadData, loading: isReservationLoading } = useReservations();
  const [today, setToday] = useState<string | null>(null);

  const loading = !today || isReservationLoading;

  useEffect(() => {
    setToday(todayISO());
    loadData();
  }, []);

  if (loading) {
    return <ReservationsSkeleton />;
  }

  return <ReservationsBoardComponent today={today} />;
}
