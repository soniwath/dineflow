import { Skeleton } from "@/components/ui/skeleton";

export default function ReservationsSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading reservations"
    >
      {/* Tabs + actions */}
      <div className="flex flex-col items-end justify-between gap-3 lg:flex-row lg:items-center">
        <div className="grid w-full grid-cols-3 gap-1.5 rounded-lg bg-muted p-1 lg:w-3/4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      {/* Day navigation */}
      <div className="flex items-center gap-1">
        <Skeleton className="size-8" />
        <Skeleton className="mx-1 h-5 w-40" />
        <Skeleton className="size-8" />
      </div>

      {/* Summary for the selected day */}
      <Skeleton className="h-5 w-56" />

      {/* List */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-16" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="size-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
