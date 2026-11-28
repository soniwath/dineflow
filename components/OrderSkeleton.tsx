import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading menu">
      {/* Top bar: category tabs + cart trigger */}
      <div className="flex flex-col items-end justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex w-full gap-1.5 rounded-lg bg-muted p-1 lg:w-3/4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0" />
          ))}
        </div>

        <Skeleton className="h-9 w-36 shrink-0" />
      </div>

      {/* Menu grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="overflow-hidden p-0">
            <Skeleton className="aspect-4/3 w-full rounded-none" />
            <CardContent className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
            <CardFooter className="flex items-center justify-between p-3 pt-0">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
