/**
 * GenerateNextCycleDialog - Multi-step wizard dialog for generating next training cycle
 *
 * Steps:
 * 1. Form - input cycle duration and notes
 * 2. Loading - AI is generating the plan
 * 3. Preview - show generated plan with progression summary and accept/reject actions
 */

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, ArrowRight, TrendingUp, Calendar } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { toast } from "sonner";
import { generateNextCycle, createPlan } from "@/lib/api/plans";
import type { PlanResponse, GenerateNextCycleResponse, ApiError, CreatePlanRequest, UserPreferences } from "@/types";

// ============================================================================
// Types
// ============================================================================

type GenerationStep = "input" | "generating" | "preview";

interface GenerationFormValues {
  cycle_duration_weeks: number;
  notes: string;
}

interface GenerateNextCycleDialogProps {
  plan: PlanResponse;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanCreated: (planId: string) => void;
}

// ============================================================================
// Validation Schema
// ============================================================================

const formSchema = z.object({
  cycle_duration_weeks: z
    .number()
    .int("Długość cyklu musi być liczbą całkowitą")
    .min(1, "Długość cyklu musi wynosić co najmniej 1 tydzień")
    .max(12, "Długość cyklu nie może przekraczać 12 tygodni"),
  notes: z.string().max(500, "Notatki nie mogą przekraczać 500 znaków").optional().default(""),
});

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Loading state during AI generation
 */
function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-10 text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Analizuję Twoje postępy...</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          AI przegląda historię Twoich treningów i przygotowuje propozycję progresji dla kolejnego cyklu.
        </p>
      </div>
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Preview of generated plan with progression summary
 */
function PreviewState({
  previewData,
  isSaving,
  error,
  onAccept,
  onBack,
}: {
  previewData: GenerateNextCycleResponse;
  isSaving: boolean;
  error: ApiError | null;
  onAccept: () => void;
  onBack: () => void;
}) {
  const { plan, progression_summary, metadata } = previewData;

  // Count days and exercises
  const totalDays = Object.keys(plan.schedule).length;
  const totalExercises = Object.values(plan.schedule).reduce((acc, day) => acc + day.exercises.length, 0);

  return (
    <div className="space-y-6">
      {/* Success indicator */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
        <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
        <div>
          <p className="font-medium text-green-900 dark:text-green-100">Plan wygenerowany!</p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Wygenerowano w {(metadata.generation_time_ms / 1000).toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Plan summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4" />
            {plan.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Okres</p>
              <p className="font-medium">
                {new Date(plan.effective_from).toLocaleDateString("pl-PL")} -{" "}
                {new Date(plan.effective_to).toLocaleDateString("pl-PL")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Struktura</p>
              <p className="font-medium">
                {totalDays} dni, {totalExercises} ćwiczeń
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progression summary */}
      {progression_summary.changes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Wprowadzone progresje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {progression_summary.changes.map((change, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0 mt-0.5">
                    {index + 1}
                  </Badge>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Błąd zapisywania</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error.message || "Nie udało się zapisać planu. Spróbuj ponownie."}</p>
            {error.details && (
              <div className="text-xs space-y-1 mt-2">
                {Object.entries(error.details).map(([field, messages]) => (
                  <div key={field}>
                    <strong>{field}:</strong> {Array.isArray(messages) ? messages.join(", ") : String(messages)}
                  </div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSaving}>
          Wróć do formularza
        </Button>
        <Button type="button" onClick={onAccept} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Zapisuję...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Zapisz i rozpocznij nowy cykl
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Error state for generation failures
 */
function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="space-y-4 py-4">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Błąd generowania</AlertTitle>
        <AlertDescription className="mt-2">
          <span>{error.message || "Wystąpił problem z generowaniem planu. Spróbuj ponownie później."}</span>
        </AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GenerateNextCycleDialog({ plan, isOpen, onOpenChange, onPlanCreated }: GenerateNextCycleDialogProps) {
  // State
  const [step, setStep] = useState<GenerationStep>("input");
  const [previewData, setPreviewData] = useState<GenerateNextCycleResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get default cycle duration from current plan preferences
  const defaultCycleDuration = (plan.preferences as UserPreferences)?.cycle_duration_weeks ?? 4;

  // Form setup
  const form = useForm<GenerationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cycle_duration_weeks: defaultCycleDuration,
      notes: "",
    },
  });

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Reset state when closing
        setStep("input");
        setPreviewData(null);
        setError(null);
        setIsSaving(false);
        form.reset({
          cycle_duration_weeks: defaultCycleDuration,
          notes: "",
        });
      }
      onOpenChange(open);
    },
    [onOpenChange, form, defaultCycleDuration]
  );

  // Generate next cycle
  const handleGenerate = useCallback(
    async (values: GenerationFormValues) => {
      setStep("generating");
      setError(null);

      try {
        const response = await generateNextCycle(plan.id, {
          cycle_duration_weeks: values.cycle_duration_weeks,
          notes: values.notes || undefined,
        });
        setPreviewData(response);
        setStep("preview");
      } catch (err) {
        setError(err as ApiError);
        setStep("input");
      }
    },
    [plan.id]
  );

  // Accept and save generated plan
  const handleAccept = useCallback(async () => {
    if (!previewData) return;

    setIsSaving(true);
    setError(null); // Clear any previous errors

    try {
      // Build CreatePlanRequest from preview data
      // Check if plan has valid preferences (was created by AI) or use defaults
      const hasValidPreferences = plan.preferences && Object.keys(plan.preferences).length > 0;

      const preferences: UserPreferences = hasValidPreferences
        ? {
            ...(plan.preferences as UserPreferences),
            cycle_duration_weeks: form.getValues("cycle_duration_weeks"),
            notes: form.getValues("notes") || undefined,
          }
        : {
            // Default preferences for plans that don't have them (manual plans)
            goal: "hypertrophy",
            system: "ppl",
            available_days: ["monday", "wednesday", "friday"],
            session_duration_minutes: 60,
            cycle_duration_weeks: form.getValues("cycle_duration_weeks"),
            notes: form.getValues("notes") || undefined,
          };

      const createRequest: CreatePlanRequest = {
        name: previewData.plan.name,
        effective_from: previewData.plan.effective_from,
        effective_to: previewData.plan.effective_to,
        source: "ai",
        prompt: null,
        preferences,
        plan: {
          schedule: previewData.plan.schedule,
        },
      };

      const createdPlan = await createPlan(createRequest);
      toast.success("Nowy plan został utworzony!");
      onPlanCreated(createdPlan.id);
      handleOpenChange(false);
    } catch (err) {
      const apiError = err as ApiError;
      // eslint-disable-next-line no-console
      console.error("Failed to save next cycle plan:", apiError);
      setError(apiError);
      setIsSaving(false);
      toast.error(apiError.message || "Nie udało się zapisać planu");
    }
  }, [previewData, plan.preferences, form, onPlanCreated, handleOpenChange]);

  // Go back to form
  const handleBack = useCallback(() => {
    setStep("input");
    setPreviewData(null);
    setError(null);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Generuj kolejny cykl
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "AI przeanalizuje Twoje postępy i zaproponuje progresję na kolejny cykl treningowy."}
            {step === "generating" && "Trwa generowanie..."}
            {step === "preview" && "Sprawdź wygenerowany plan i wprowadzone zmiany."}
          </DialogDescription>
        </DialogHeader>

        {/* Error state */}
        {error && step === "input" && <ErrorState error={error} onRetry={() => setError(null)} />}

        {/* Step 1: Input Form */}
        {step === "input" && !error && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-4">
              <FormField
                control={form.control}
                name="cycle_duration_weeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Długość cyklu (tygodnie)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>Ile tygodni ma trwać kolejny cykl treningowy (1-12)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notatki (opcjonalne)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Np. chcę skupić się na górnej partii ciała, odczuwam lekki ból kolana..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Dodatkowe informacje dla AI (max 500 znaków)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" className="gap-2">
                  <Sparkles className="size-4" />
                  Generuj plan
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 2: Loading */}
        {step === "generating" && <GeneratingState />}

        {/* Step 3: Preview */}
        {step === "preview" && previewData && (
          <PreviewState
            previewData={previewData}
            isSaving={isSaving}
            error={error}
            onAccept={handleAccept}
            onBack={handleBack}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
