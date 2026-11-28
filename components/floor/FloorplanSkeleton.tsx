import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_TABLES = [
  { left: "18%", top: "24%", className: "h-16 w-16 rounded-xl" },
  { left: "42%", top: "24%", className: "h-16 w-24 rounded-xl" },
  { left: "70%", top: "26%", className: "size-20 rounded-full" },
  { left: "22%", top: "62%", className: "size-16 rounded-full" },
  { left: "50%", top: "64%", className: "h-16 w-28 rounded-xl" },
  { left: "78%", top: "66%", className: "h-16 w-16 rounded-xl" },
];

export default function FloorplanSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading floor plan">
      {/* Zone tabs + edit controls */}
      <div className="flex flex-col items-end justify-between gap-3 lg:flex-row lg:items-center">
        <div className="grid w-full grid-cols-3 gap-1.5 rounded-lg bg-muted p-1 lg:w-3/4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>

        <Skeleton className="h-8 w-28 shrink-0" />
      </div>

      {/* Legend + totals */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-3.5 rounded-sm" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
        <Skeleton className="ml-auto h-4 w-28" />
      </div>

      {/* Helper prompt */}
      <Skeleton className="h-5 w-72" />

      {/* Canvas */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div
          className="relative h-130"
          style={{
            backgroundImage:
              "radial-gradient(var(--border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {PLACEHOLDER_TABLES.map((t, i) => (
            <Skeleton
              key={i}
              style={{
                left: t.left,
                top: t.top,
                transform: "translate(-50%, -50%)",
              }}
              className={`absolute ${t.className}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
