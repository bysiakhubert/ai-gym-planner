/**
 * PlanEditorView - Main container for editing training plans
 *
 * Handles form state management, API integration, and orchestrates
 * all child components for editing plan metadata and schedule.
 */

import { useEffect, useCallback } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Plus, Loader2 } from "lucide-react";
import { Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

import { DayCard } from "./DayCard";
import { DatePicker } from "./DatePicker";
import { usePlanEditor } from "@/hooks/usePlanEditor";
import {
  PlanEditorFormSchema,
  createDefaultDayValues,
  getNextDayDate,
  type PlanEditorFormValues,
} from "@/lib/schemas/plan-editor";

interface PlanEditorViewProps {
  planId: string;
}

/**
 * Loading skeleton for the editor
 */
function EditorLoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-9 rounded bg-muted" />
          <div className="h-8 w-48 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded bg-muted" />
          <div className="h-9 w-24 rounded bg-muted" />
        </div>
      </div>

      {/* General info card skeleton */}
      <div className="rounded-xl border p-6 space-y-4">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>

      {/* Days skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 rounded bg-muted" />
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-32 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function EditorErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
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

export function PlanEditorView({ planId }: PlanEditorViewProps) {
  const { plan, isLoading, isSaving, error, loadPlan, savePlan, transformApiToForm } = usePlanEditor();

  // Initialize form with validation
  const form = useForm<PlanEditorFormValues>({
    resolver: zodResolver(PlanEditorFormSchema),
    defaultValues: {
      name: "",
      effective_from: "",
      effective_to: "",
      days: [],
    },
  });

  // Field array for managing days
  const {
    fields: dayFields,
    append: appendDay,
    remove: removeDay,
  } = useFieldArray({
    control: form.control,
    name: "days",
  });

  // Load plan data on mount
  useEffect(() => {
    const initializePlan = async () => {
      const loadedPlan = await loadPlan(planId);
      if (loadedPlan) {
        const formValues = transformApiToForm(loadedPlan);
        form.reset(formValues);
      }
    };

    initializePlan();
  }, [planId, loadPlan, transformApiToForm, form]);

  // Handle form submission
  const onSubmit = useCallback(
    async (values: PlanEditorFormValues) => {
      const result = await savePlan(planId, values);
      if (result) {
        // Redirect to plan details after successful save
        window.location.href = `/plans/${planId}`;
      }
    },
    [planId, savePlan]
  );

  // Handle adding a new day
  const handleAddDay = useCallback(() => {
    const currentDays = form.getValues("days");
    const nextDate = getNextDayDate(currentDays);
    appendDay(createDefaultDayValues(nextDate));
  }, [form, appendDay]);

  // Handle cancel/back navigation
  const handleCancel = useCallback(() => {
    window.location.href = `/plans/${planId}`;
  }, [planId]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    loadPlan(planId);
  }, [loadPlan, planId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <EditorLoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <EditorErrorState message={error.message || "Nie udało się załadować planu"} onRetry={handleRetry} />
      </div>
    );
  }

  // No plan loaded
  if (!plan) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <EditorErrorState message="Plan nie został znaleziony" onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Toaster position="top-center" richColors />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button type="button" variant="ghost" size="icon" onClick={handleCancel} aria-label="Wróć do listy planów">
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Edytuj plan</h1>
                <p className="text-sm text-muted-foreground">Modyfikuj harmonogram treningowy</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Zapisz zmiany
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Form-level errors */}
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Błąd formularza</AlertTitle>
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}

          {/* Days array error (e.g., duplicate dates) */}
          {form.formState.errors.days?.root && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Błąd harmonogramu</AlertTitle>
              <AlertDescription>{form.formState.errors.days.root.message}</AlertDescription>
            </Alert>
          )}

          {/* General Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informacje o planie</CardTitle>
              <CardDescription>Podstawowe dane i okres obowiązywania planu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Plan name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3 lg:col-span-1">
                      <FormLabel>Nazwa planu</FormLabel>
                      <FormControl>
                        <Input placeholder="np. Plan siłowy - Grudzień 2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Effective from */}
                <FormField
                  control={form.control}
                  name="effective_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obowiązuje od</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} placeholder="Data rozpoczęcia" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Effective to */}
                <FormField
                  control={form.control}
                  name="effective_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obowiązuje do</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} placeholder="Data zakończenia" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Harmonogram treningów</h2>
                <p className="text-sm text-muted-foreground">
                  {dayFields.length} {dayFields.length === 1 ? "dzień" : dayFields.length < 5 ? "dni" : "dni"}{" "}
                  treningowych
                </p>
              </div>
              <Button type="button" variant="outline" onClick={handleAddDay} className="gap-2">
                <Plus className="size-4" />
                Dodaj dzień
              </Button>
            </div>

            {/* Days list */}
            <div className="space-y-4">
              {dayFields.map((dayField, index) => (
                <DayCard
                  key={dayField.id}
                  index={index}
                  onRemove={() => removeDay(index)}
                  canRemove={dayFields.length > 1}
                />
              ))}
            </div>

            {/* Empty state for days */}
            {dayFields.length === 0 && (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="mb-4 text-center text-muted-foreground">
                    Brak dni treningowych. Dodaj pierwszy dzień do harmonogramu.
                  </p>
                  <Button type="button" variant="outline" onClick={handleAddDay} className="gap-2">
                    <Plus className="size-4" />
                    Dodaj dzień treningowy
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bottom actions (mobile-friendly) */}
          <div className="sticky bottom-4 flex justify-end gap-2 rounded-lg border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Zapisz
                </>
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

