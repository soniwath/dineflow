import { Skeleton } from "@/components/ui/skeleton";

export default function BillingSkeleton() {
  return (
    <section
      aria-label="Loading billing"
      aria-busy="true"
      className="min-h-[calc(100dvh-6rem)] space-y-6 rounded-xl bg-background p-4 text-foreground sm:p-6"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-9 w-28" />
      </header>

      {/* Main grid */}
      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Sidebar bill list */}
        <aside className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-md border px-4 py-3"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </aside>

        {/* BillDetails panel */}
        <div className="space-y-6 rounded-xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>

          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </section>
  );
}
