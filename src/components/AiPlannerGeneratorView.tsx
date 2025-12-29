import { useAiPlannerGenerator } from "@/hooks/useAiPlannerGenerator";
import { PlannerForm } from "./PlannerForm";
import { PlanPreview } from "./PlanPreview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import type { UserPreferences } from "@/types";

export function AiPlannerGeneratorView() {
  const { viewState, previewData, error, isSaving, generatePlan, acceptPlan, rejectPlan, editPlan } =
    useAiPlannerGenerator();

  const handleFormSubmit = (preferences: UserPreferences) => {
    generatePlan(preferences);
  };

  // Loading state
  if (viewState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Generowanie planu...</h2>
            <p className="text-muted-foreground">AI tworzy spersonalizowany plan treningowy. To może potrwać chwilę.</p>
          </div>
        </div>
      </div>
    );
  }

  // Preview state
  if (viewState === "preview" && previewData) {
    return (
      <PlanPreview
        previewData={previewData}
        isSaving={isSaving}
        onAccept={acceptPlan}
        onReject={rejectPlan}
        onEdit={editPlan}
      />
    );
  }

  // Error state
  if (viewState === "error" && error) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wystąpił błąd</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>{error.message || "Nie udało się wygenerować planu. Spróbuj ponownie."}</p>
              {error.error === "ValidationError" && (
                <p className="text-sm mt-1 opacity-90">
                  Sprawdź poprawność wszystkich pól formularza i spróbuj ponownie.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
        <PlannerForm isSubmitting={false} onSubmit={handleFormSubmit} />
      </div>
    );
  }

  // Form state (default)
  return <PlannerForm isSubmitting={false} onSubmit={handleFormSubmit} />;
}
