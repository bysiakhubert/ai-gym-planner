/**
 * SessionDetailsView - Read-only view of a completed training session
 *
 * Displays session metadata, exercises with planned vs actual comparison
 */

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Dumbbell,
  Weight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { fetchSession } from "@/lib/api/sessions";
import type { SessionResponse, SessionExercise, SessionSet, ApiError } from "@/types";

interface SessionDetailsViewProps {
  sessionId: string;
}

/**
 * Loading skeleton for the session details view
 */
function DetailsLoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="size-9 rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl border bg-muted" />
        <div className="h-24 rounded-xl border bg-muted" />
        <div className="h-24 rounded-xl border bg-muted" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border p-6 space-y-4">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error state component
 */
function DetailsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="max-w-lg mx-auto">
      <AlertCircle className="size-4" />
      <AlertTitle>Błąd ładowania sesji</AlertTitle>
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
 * Formats date to Polish locale
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formats time from ISO string
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Calculates duration in minutes between two ISO timestamps
 */
function calculateDurationMinutes(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) return null;
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Formats duration in minutes to a user-friendly string
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes} min`;
}

/**
 * Trend indicator for comparing actual vs planned
 */
function TrendIndicator({ actual, planned }: { actual: number | null | undefined; planned: number }) {
  if (actual == null) return <Minus className="size-3 text-muted-foreground" />;

  if (actual > planned) {
    return <TrendingUp className="size-3 text-green-600" />;
  }
  if (actual < planned) {
    return <TrendingDown className="size-3 text-amber-600" />;
  }
  return <Minus className="size-3 text-muted-foreground" />;
}

/**
 * Single set row displaying planned vs actual values
 */
function SetDetailRow({ set, setIndex }: { set: SessionSet; setIndex: number }) {
  const isCompleted = set.completed;

  return (
    <div
      className={`grid grid-cols-[40px_1fr_1fr] sm:grid-cols-[50px_1fr_1fr] gap-2 sm:gap-4 py-2 px-2 sm:px-3 rounded-lg ${
        isCompleted ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-center">
        <span className="text-sm font-medium text-muted-foreground">{setIndex + 1}</span>
      </div>

      {/* Weight column */}
      <div className="flex flex-col gap-0.5">
        <div className="text-xs text-muted-foreground">Ciężar</div>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            <span className="text-muted-foreground">{set.planned_weight ?? "—"}</span>
            {set.actual_weight != null && (
              <>
                <span className="mx-1">→</span>
                <span className="font-medium">{set.actual_weight}</span>
              </>
            )}
            <span className="text-muted-foreground text-xs ml-1">kg</span>
          </span>
          {set.planned_weight != null && <TrendIndicator actual={set.actual_weight} planned={set.planned_weight} />}
        </div>
      </div>

      {/* Reps column */}
      <div className="flex flex-col gap-0.5">
        <div className="text-xs text-muted-foreground">Powtórzenia</div>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            <span className="text-muted-foreground">{set.planned_reps}</span>
            {set.actual_reps != null && (
              <>
                <span className="mx-1">→</span>
                <span className="font-medium">{set.actual_reps}</span>
              </>
            )}
          </span>
          <TrendIndicator actual={set.actual_reps} planned={set.planned_reps} />
        </div>
      </div>
    </div>
  );
}

/**
 * Exercise card displaying all sets with comparison
 */
function ExerciseDetailCard({ exercise }: { exercise: SessionExercise }) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const isFullyCompleted = completedSets === totalSets;

  return (
    <Card className={isFullyCompleted ? "border-green-200 dark:border-green-800" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            <CardTitle className="text-lg">{exercise.name}</CardTitle>
          </div>
          <Badge variant={isFullyCompleted ? "default" : "secondary"} className={isFullyCompleted ? "bg-green-600" : ""}>
            {completedSets}/{totalSets} serii
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {exercise.sets.map((set, setIdx) => (
          <SetDetailRow key={setIdx} set={set} setIndex={setIdx} />
        ))}
      </CardContent>
    </Card>
  );
}

export function SessionDetailsView({ sessionId }: SessionDetailsViewProps) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSession(sessionId);
      setSession(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Nie udało się załadować sesji");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleBack = () => {
    window.location.href = "/history";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <DetailsLoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <DetailsErrorState message={error} onRetry={loadSession} />
      </div>
    );
  }

  // No session
  if (!session) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <DetailsErrorState message="Sesja nie została znaleziona" onRetry={loadSession} />
      </div>
    );
  }

  const { session: sessionData, started_at, ended_at } = session;
  const durationMinutes = calculateDurationMinutes(started_at, ended_at);
  const isCompleted = ended_at !== null;

  // Calculate stats
  let completedSets = 0;
  let totalSets = 0;
  for (const exercise of sessionData.exercises) {
    for (const set of exercise.sets) {
      totalSets++;
      if (set.completed) completedSets++;
    }
  }
  const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={handleBack} aria-label="Wróć do historii">
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{sessionData.day_name}</h1>
          <p className="text-muted-foreground">{sessionData.plan_name}</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="size-4" />
              <span>Data</span>
            </div>
            <div className="font-semibold">{formatDate(sessionData.date)}</div>
            {isCompleted && (
              <div className="text-sm text-muted-foreground">
                {formatTime(started_at)} – {formatTime(ended_at!)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="size-4" />
              <span>Czas trwania</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(durationMinutes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="size-4" />
              <span>Ukończone serie</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{completedSets}/{totalSets}</span>
              {completionRate === 100 && (
                <Badge className="bg-green-600">100%</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exercises */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Ćwiczenia ({sessionData.exercises.length})
        </h2>

        {sessionData.exercises.map((exercise, idx) => (
          <ExerciseDetailCard key={idx} exercise={exercise} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <p className="font-medium mb-2">Legenda:</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Plan</span>
            <span className="mx-1">→</span>
            <span className="font-medium text-foreground">Wykonane</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="size-3 text-green-600" />
            <span>Więcej niż plan</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="size-3 text-amber-600" />
            <span>Mniej niż plan</span>
          </div>
        </div>
      </div>
    </div>
  );
}

