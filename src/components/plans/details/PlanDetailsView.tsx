/**
 * PlanDetailsView - Read-only view of a training plan
 *
 * Displays plan metadata and schedule in a non-editable format
 * with navigation to the edit page.
 */

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Sparkles,
  User,
  Dumbbell,
  Clock,
  Weight,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { GenerateNextCycleDialog } from "./GenerateNextCycleDialog";

import { fetchPlan } from "@/lib/api/plans";
import type { PlanResponse, ApiError, WorkoutDay } from "@/types";

interface PlanDetailsViewProps {
  planId: string;
}

/**
 * Loading skeleton for the details view
 */
function DetailsLoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-9 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-64 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
          </div>
        </div>
        <div className="h-9 w-24 rounded bg-muted" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-20 rounded bg-muted" />
          <div className="h-20 rounded bg-muted" />
          <div className="h-20 rounded bg-muted" />
        </div>
      </div>
      {[1, 2].map((i) => (
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
      <AlertTitle>Błąd ładowania planu</AlertTitle>
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
  return format(date, "d MMMM yyyy", { locale: pl });
}

/**
 * Calculate plan status based on dates
 */
function getPlanStatus(effectiveFrom: string, effectiveTo: string): "active" | "upcoming" | "completed" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = new Date(effectiveFrom);
  from.setHours(0, 0, 0, 0);

  const to = new Date(effectiveTo);
  to.setHours(0, 0, 0, 0);

  if (today < from) return "upcoming";
  if (today > to) return "completed";
  return "active";
}

const statusConfig = {
  active: { label: "Aktywny", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  upcoming: { label: "Nadchodzący", className: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  completed: { label: "Zakończony", className: "bg-neutral-500/15 text-neutral-600 border-neutral-500/30" },
};

/**
 * Single workout day display component
 */
function WorkoutDayCard({ date, day }: { date: string; day: WorkoutDay }) {
  const formattedDate = formatDate(date);
  const totalSets = day.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <Card className={day.done ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                day.done ? "bg-green-500/20 text-green-600" : "bg-primary text-primary-foreground"
              }`}
            >
              {day.done ? <CheckCircle2 className="size-5" /> : <Calendar className="size-5" />}
            </div>
            <div>
              <CardTitle className="text-base">{day.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{day.exercises.length} ćwiczeń</p>
            <p>{totalSets} serii</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {day.exercises.map((exercise, exIndex) => (
            <div key={exIndex} className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="size-4 text-primary" />
                <span className="font-medium">{exercise.name}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {exercise.sets.length} {exercise.sets.length === 1 ? "seria" : "serii"}
                </Badge>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                {exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} className="flex items-center gap-4 pl-6">
                    <span className="w-16">Seria {setIndex + 1}:</span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{set.reps}</span> powt.
                    </span>
                    {set.weight && (
                      <span className="flex items-center gap-1">
                        <Weight className="size-3" />
                        <span className="font-medium text-foreground">{set.weight}</span> kg
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span className="font-medium text-foreground">{set.rest_seconds}</span>s przerwy
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlanDetailsView({ planId }: PlanDetailsViewProps) {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPlan(planId);
      setPlan(data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleBack = () => {
    window.location.href = "/plans";
  };

  const handleEdit = () => {
    window.location.href = `/plans/${planId}/edit`;
  };

  const handleGenerateNextCycle = () => {
    setIsGenerateModalOpen(true);
  };

  const handlePlanCreated = (newPlanId: string) => {
    toast.success("Nowy plan został utworzony!");
    window.location.href = `/plans/${newPlanId}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <DetailsLoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <DetailsErrorState message={error.message || "Nie udało się załadować planu"} onRetry={loadPlan} />
      </div>
    );
  }

  // No plan
  if (!plan) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <DetailsErrorState message="Plan nie został znaleziony" onRetry={loadPlan} />
      </div>
    );
  }

  const status = getPlanStatus(plan.effective_from, plan.effective_to);
  const { label: statusLabel, className: statusClassName } = statusConfig[status];

  // Sort schedule entries by date
  const sortedDays = Object.entries(plan.plan.schedule).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));

  const completedDays = sortedDays.filter(([, day]) => day.done).length;
  const totalDays = sortedDays.length;

  // "Generate next cycle" button is always visible - user can prepare next cycle anytime
  const canGenerateNextCycle = true;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={handleBack} aria-label="Wróć do listy planów">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {plan.source === "ai" ? (
                <Sparkles className="size-5 text-violet-500" />
              ) : (
                <User className="size-5 text-muted-foreground" />
              )}
              <h1 className="text-2xl font-bold">{plan.name}</h1>
              <Badge className={statusClassName}>{statusLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(plan.effective_from)} – {formatDate(plan.effective_to)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canGenerateNextCycle && (
            <Button onClick={handleGenerateNextCycle} variant="outline" className="gap-2">
              <RotateCcw className="size-4" />
              Generuj kolejny cykl
            </Button>
          )}
          <Button onClick={handleEdit} className="gap-2">
            <Pencil className="size-4" />
            Edytuj plan
          </Button>
        </div>
      </div>

      {/* Safety Disclaimer for AI-generated plans */}
      {plan.source === "ai" && (
        <div className="mb-6">
          <SafetyDisclaimer />
        </div>
      )}

      {/* Info cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Status</div>
            <Badge className={`mt-1 ${statusClassName}`}>{statusLabel}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Postęp</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold">{completedDays}</span>
              <span className="text-muted-foreground">/ {totalDays} dni</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Źródło</div>
            <div className="mt-1 flex items-center gap-2">
              {plan.source === "ai" ? (
                <>
                  <Sparkles className="size-4 text-violet-500" />
                  <span>Wygenerowany przez AI</span>
                </>
              ) : (
                <>
                  <User className="size-4 text-muted-foreground" />
                  <span>Utworzony ręcznie</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Harmonogram ({totalDays} dni)</h2>

        {sortedDays.map(([date, day]) => (
          <WorkoutDayCard key={date} date={date} day={day} />
        ))}

        {sortedDays.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Ten plan nie ma jeszcze żadnych dni treningowych.</p>
              <Button variant="outline" onClick={handleEdit} className="mt-4 gap-2">
                <Pencil className="size-4" />
                Dodaj dni w edytorze
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Next Cycle Dialog */}
      <GenerateNextCycleDialog
        plan={plan}
        isOpen={isGenerateModalOpen}
        onOpenChange={setIsGenerateModalOpen}
        onPlanCreated={handlePlanCreated}
      />
    </div>
  );
}
