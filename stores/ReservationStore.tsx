"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useFloor } from "@/stores/FloorStore";
import {
  Reservation,
  ReservationInput,
  ReservationStatus,
} from "@/types/Reservation";
import {
  getReservationsApi,
  addReservationApi,
  updateReservationApi,
} from "@/lib/api/reservations";
import { createNotificationApi } from "@/lib/api/notifications";
import { formatDate, formatTime } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types & Helpers                                                     */
/* ------------------------------------------------------------------ */
export const STATUS_LABEL: Record<ReservationStatus, string> = {
  booked: "Booked",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

const HOLD_MINUTES = 90;

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(y, m - 1, d + n));
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const isActive = (r: Reservation) =>
  r.status === "booked" || r.status === "seated";

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */
type ReservationContextValue = {
  reservations: Reservation[];
  loading: boolean;
  addReservation: (input: ReservationInput) => Promise<Reservation>;
  updateReservation: (id: string, input: ReservationInput) => Promise<void>;
  assignTable: (id: string, tableId: string | null) => Promise<void>;
  seatReservation: (id: string) => Promise<void>;
  completeReservation: (id: string) => Promise<void>;
  cancelReservation: (
    id: string,
    reason: "cancelled" | "no-show",
  ) => Promise<void>;
  tableConflict: (
    tableId: string,
    date: string,
    time: string,
    excludeId?: string,
  ) => Reservation | undefined;
  loadData: () => Promise<void>;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const { tables, setStatus, updateTable } = useFloor();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReservationsApi();
      setReservations(data);
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const conflictIn = (
    list: Reservation[],
    tableId: string,
    date: string,
    time: string,
    excludeId?: string,
  ) =>
    list.find(
      (r) =>
        r.id !== excludeId &&
        r.tableId === tableId &&
        isActive(r) &&
        r.date === date &&
        Math.abs(toMinutes(r.time) - toMinutes(time)) < HOLD_MINUTES,
    );

  function releaseIfUnheld(tableId: string, list: Reservation[]) {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.status !== "reserved") return;
    const today = todayISO();
    const stillHeld = list.some(
      (r) => r.tableId === tableId && r.status === "booked" && r.date === today,
    );
    if (!stillHeld) setStatus(tableId, "free");
  }

  const addReservation = async (input: ReservationInput) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Reservation = {
      ...input,
      id: tempId,
      status: "booked",
      tableId: null,
    };
    setReservations((prev) => [...prev, optimistic]);

    try {
      const saved = await addReservationApi(input);
      setReservations((prev) => prev.map((r) => (r.id === tempId ? saved : r)));

      // Notify users when a new reservation is added
      // This could be useful for staff to be aware of new bookings
      await createNotificationApi({
        title: "New Reservation",
        message: `New reservation for ${input.name} on ${formatDate(
          input.date,
        )} at ${formatTime(input.time)}.`,
        type: "reservation_update",
      });

      return saved;
    } catch (error) {
      console.error("Failed to add reservation:", error);
      loadData();
      throw error;
    }
  };

  const updateReservation = async (id: string, input: ReservationInput) => {
    const current = reservations.find((r) => r.id === id);
    if (!current) return;

    let tableId = current.tableId;
    if (tableId) {
      const table = tables.find((t) => t.id === tableId);
      const tooSmall = !table || table.seats < input.party;
      const clash = conflictIn(
        reservations,
        tableId,
        input.date,
        input.time,
        id,
      );
      if (tooSmall || clash) tableId = null;
    }

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...input, tableId } : r)),
    );

    try {
      await updateReservationApi({ id, ...input, tableId });
      if (current.tableId && current.tableId !== tableId) {
        releaseIfUnheld(current.tableId, reservations);
      }

      // notify users when reservation is updated
      await createNotificationApi({
        title: "Reservation Updated",
        message: `Reservation for ${input.name} on ${formatDate(
          input.date,
        )} at ${formatTime(input.time)} has been updated.`,
        type: "reservation_update",
      });
    } catch (error) {
      console.error("Failed to update reservation:", error);
      loadData();
    }
  };

  const assignTable = async (id: string, tableId: string | null) => {
    const current = reservations.find((r) => r.id === id);
    if (!current) return;
    const previous = current.tableId;

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, tableId } : r)),
    );

    try {
      await updateReservationApi({ id, tableId });
      if (previous && previous !== tableId)
        releaseIfUnheld(previous, reservations);

      if (
        tableId &&
        current.status === "booked" &&
        current.date === todayISO()
      ) {
        const table = tables.find((t) => t.id === tableId);
        if (table?.status === "free") setStatus(tableId, "reserved");
      }
    } catch (error) {
      console.error("Failed to assign table:", error);
      loadData();
    }
  };

  const seatReservation = async (id: string) => {
    const current = reservations.find((r) => r.id === id);
    if (!current || current.status !== "booked" || !current.tableId) return;

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "seated" } : r)),
    );

    try {
      await updateReservationApi({ id, status: "seated" });
      setStatus(current.tableId, "occupied");
      updateTable(current.tableId, { guests: current.party });
    } catch (error) {
      console.error("Failed to seat reservation:", error);
      loadData();
    }
  };

  const completeReservation = async (id: string) => {
    const current = reservations.find((r) => r.id === id);
    if (!current || current.status !== "seated") return;

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
    );

    try {
      await updateReservationApi({ id, status: "completed" });
      if (current.tableId) setStatus(current.tableId, "cleaning");
    } catch (error) {
      console.error("Failed to complete reservation:", error);
      loadData();
    }
  };

  const cancelReservation = async (
    id: string,
    reason: "cancelled" | "no-show",
  ) => {
    const current = reservations.find((r) => r.id === id);
    if (!current) return;

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: reason } : r)),
    );

    try {
      await updateReservationApi({ id, status: reason });
      if (current.tableId) releaseIfUnheld(current.tableId, reservations);

      // notify users when reservation is cancelled or marked as no-show
      // This could be useful for staff to be aware of cancellations or no-shows
      await createNotificationApi({
        title: `Reservation ${reason === "cancelled" ? "Cancelled" : "No-show"}`,
        message: `Reservation for ${current.name} on ${formatDate(
          current.date,
        )} at ${formatTime(current.time)} has been ${
          reason === "cancelled" ? "cancelled" : "marked as no-show"
        }.`,
        type: "reservation_cancelled",
      });
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      loadData();
    }
  };

  const value: ReservationContextValue = {
    reservations,
    loading,
    addReservation,
    updateReservation,
    assignTable,
    seatReservation,
    completeReservation,
    cancelReservation,
    tableConflict: (tableId, date, time, excludeId) =>
      conflictIn(reservations, tableId, date, time, excludeId),
    loadData,
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationContext);
  if (!ctx) {
    throw new Error(
      "useReservations must be used inside <ReservationProvider>",
    );
  }
  return ctx;
}
