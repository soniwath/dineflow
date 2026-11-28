import { Skeleton } from "@/components/ui/skeleton";

export default function SchedulingSkeleton() {
  return (
    <section
      aria-label="Loading schedule"
      aria-busy="true"
      className="min-w-0 space-y-5"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </header>

      {/* Main grid */}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          {/* Week range + navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-7 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-9" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="size-9" />
            </div>
          </div>

          {/* Role color legend */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-md" />
            ))}
          </div>

          {/* Weekly schedule table */}
          <div className="min-w-0 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[1080px] border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 z-10 w-36 border-r bg-card p-4 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th
                      key={i}
                      className="w-36 border-r p-3 text-center last:border-r-0"
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="size-8 rounded-full" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, rowIdx) => (
                  <tr key={rowIdx} className="border-b last:border-b-0">
                    <th className="sticky left-0 z-10 border-r bg-card p-4 text-left">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </th>
                    {Array.from({ length: 7 }).map((_, colIdx) => (
                      <td
                        key={colIdx}
                        className="h-28 border-r p-2 align-top last:border-r-0"
                      >
                        {(rowIdx + colIdx) % 2 === 0 && (
                          <Skeleton className="h-14 w-full rounded-lg" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Skeleton className="h-4 w-64" />
        </div>

        {/* Attendance panel */}
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3.5 w-40" />
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>

          <div className="space-y-3 border-t pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
