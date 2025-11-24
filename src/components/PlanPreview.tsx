import { Button } from "@/components/ui/button";
import { SafetyDisclaimer } from "./SafetyDisclaimer";
import { WorkoutDayCard } from "./WorkoutDayCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Clock, Target, Loader2, CheckCircle2, XCircle, Edit, AlertCircle } from "lucide-react";
import type { GeneratePlanResponse } from "@/types";

interface PlanPreviewProps {
  previewData: GeneratePlanResponse;
  isSaving: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
}

export function PlanPreview({ previewData, isSaving, onAccept, onReject, onEdit }: PlanPreviewProps) {
  const { plan, preferences, metadata } = previewData;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getGoalLabel = (goal: string) => {
    const goals: Record<string, string> = {
      hypertrophy: "Hipertrofia (wzrost mięśni)",
      strength: "Siła",
      endurance: "Wytrzymałość",
      weight_loss: "Redukcja",
    };
    return goals[goal] || goal;
  };

  const sortedDates = Object.keys(plan.schedule).sort();
  const totalWorkouts = sortedDates.length;
  const hasWorkouts = totalWorkouts > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{plan.name}</h1>
        <p className="text-muted-foreground">
          Podgląd wygenerowanego planu treningowego. Możesz go zaakceptować, odrzucić lub edytować.
        </p>
      </div>

      {/* Plan Metadata */}
      <div className="grid gap-4 md:grid-cols-3" role="region" aria-label="Metadane planu">
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Calendar className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Okres obowiązywania</p>
            <p className="text-sm text-muted-foreground mt-1">
              <time dateTime={plan.effective_from}>{formatDate(plan.effective_from)}</time>
              <br />
              <time dateTime={plan.effective_to}>{formatDate(plan.effective_to)}</time>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Target className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Cel treningowy</p>
            <p className="text-sm text-muted-foreground mt-1">{getGoalLabel(preferences.goal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">System: {preferences.system}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Clock className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Parametry</p>
            <p className="text-sm text-muted-foreground mt-1">{preferences.session_duration_minutes} min / sesja</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalWorkouts} {totalWorkouts === 1 ? "trening" : "treningi"} w planie
            </p>
          </div>
        </div>
      </div>

      {/* Safety Disclaimer */}
      <SafetyDisclaimer />

      {/* Workout Days */}
      <section className="space-y-4" aria-labelledby="plan-schedule-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 id="plan-schedule-heading" className="text-2xl font-semibold">
            Plan treningowy
          </h2>
          <div className="text-xs sm:text-sm text-muted-foreground">
            Wygenerowano przez {metadata.model} w {(metadata.generation_time_ms / 1000).toFixed(1)}s
          </div>
        </div>

        {hasWorkouts ? (
          <div className="space-y-4" role="list" aria-label="Dni treningowe">
            {sortedDates.map((date) => {
              const workout = plan.schedule[date];
              return (
                <div key={date} role="listitem">
                  <WorkoutDayCard date={date} workout={workout} />
                </div>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Brak dni treningowych</AlertTitle>
            <AlertDescription>
              Plan nie zawiera żadnych dni treningowych. Spróbuj wygenerować plan ponownie z innymi parametrami.
            </AlertDescription>
          </Alert>
        )}
      </section>

      {/* Additional Notes */}
      {preferences.notes && (
        <Alert>
          <AlertDescription>
            <p className="font-medium mb-1">Uwagi użytkownika:</p>
            <p className="text-sm whitespace-pre-wrap">{preferences.notes}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div
        className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t pt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4"
        role="region"
        aria-label="Akcje planu"
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isSaving}
            className="sm:w-auto w-full"
            aria-label="Odrzuć plan i wróć do formularza"
          >
            <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Odrzuć
          </Button>

          <Button
            variant="outline"
            onClick={onEdit}
            disabled={isSaving}
            className="sm:w-auto w-full"
            aria-label="Przejdź do edycji planu"
          >
            <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
            Edytuj
          </Button>

          <Button
            onClick={onAccept}
            disabled={isSaving}
            className="sm:w-auto w-full"
            aria-label="Zaakceptuj i zapisz plan"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Zapisywanie...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Zaakceptuj i zapisz
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
