import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_COLUMNS = [
  { tickets: 2, hasCancelButton: true },
  { tickets: 2, hasCancelButton: false },
  { tickets: 1, hasCancelButton: false },
];

export default function KitchenSkeleton() {
  return (
    <section
      aria-label="Loading kitchen orders"
      aria-busy="true"
      className="min-h-[calc(100dvh-6rem)] space-y-6 rounded-xl bg-background p-4 text-foreground sm:p-6"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-9 w-32" />
      </header>

      {/* Status columns */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        {PLACEHOLDER_COLUMNS.map((col, colIdx) => (
          <div key={colIdx} className="min-w-0">
            <div className="mb-4 flex items-center gap-2 border-b pb-3 dark:border-[#26323a]">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: col.tickets }).map((_, ticketIdx) => (
                <article
                  key={ticketIdx}
                  className="w-full space-y-5 rounded-lg border border-l-4 bg-card p-5 dark:border-[#26323a] dark:bg-[#141b1f]"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </header>

                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>

                  <Skeleton className="h-11 w-full" />

                  {col.hasCancelButton && <Skeleton className="h-9 w-full" />}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
