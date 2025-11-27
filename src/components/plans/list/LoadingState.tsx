/**
 * LoadingState - Skeleton loading component for plans list
 *
 * Displays placeholder cards while plans are being fetched.
 */

import { Card, CardHeader, CardContent } from "@/components/ui/card";

/**
 * Single skeleton card component
 */
function PlanCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start gap-2">
          {/* Source icon placeholder */}
          <div className="size-4 rounded bg-muted" />
          {/* Title placeholder */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Date range placeholder */}
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>

        {/* Badge placeholder */}
        <div className="h-5 w-20 rounded-full bg-muted" />
      </CardContent>
    </Card>
  );
}

interface LoadingStateProps {
  count?: number;
}

export function LoadingState({ count = 6 }: LoadingStateProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Ładowanie planów..."
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <PlanCardSkeleton key={index} />
      ))}
    </div>
  );
}

