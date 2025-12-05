import { useHistorySessions } from "@/hooks/useHistorySessions";
import { HistoryList } from "./HistoryList";
import { EmptyHistoryState } from "./EmptyHistoryState";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";

/**
 * Skeleton loading component for history sessions list
 */
function HistorySessionSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            {/* Day name placeholder */}
            <div className="h-5 w-32 rounded bg-muted" />
            {/* Plan name placeholder */}
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
          {/* Date placeholder */}
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Duration placeholder */}
          <div className="h-4 w-16 rounded bg-muted" />
          {/* Sets placeholder */}
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading state component with multiple skeletons
 */
function LoadingState({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-label="Ładowanie historii..." aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <HistorySessionSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Error state component with retry button
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="max-w-lg mx-auto">
      <AlertCircle className="size-4" />
      <AlertTitle>Błąd ładowania</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4 mr-2" />
          Spróbuj ponownie
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * HistoryView - Main container for the training history view
 *
 * Smart component that handles data fetching, loading states,
 * error handling, and pagination.
 */
export function HistoryView() {
  const { sessions, isLoading, isLoadingMore, error, hasMore, loadMore, retry } = useHistorySessions();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Historia treningów</h1>
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Historia treningów</h1>
        <ErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Historia treningów</h1>
        <EmptyHistoryState />
      </div>
    );
  }

  // Content state
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Historia treningów</h1>
      
      <HistoryList sessions={sessions} />

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Ładowanie...
              </>
            ) : (
              "Pokaż starsze treningi"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

