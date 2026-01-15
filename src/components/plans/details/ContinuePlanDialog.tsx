/**
 * ContinuePlanDialog - Dialog for continuing/duplicating a training plan
 *
 * Allows users to duplicate an existing plan for a new time period
 * without AI modifications, just copying the structure.
 */

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Loader2, Copy, Calendar as CalendarIcon, AlertCircle } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { continuePlan } from "@/lib/api/plans";
import type { ApiError } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface ContinuePlanDialogProps {
  planId: string;
  currentPlanName: string;
  currentPlanEndDate: string; // ISO date string
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newPlanId: string) => void;
}

interface ContinuePlanFormData {
  name: string;
  effectiveFrom: Date | undefined;
}

// ============================================================================
// Validation Schema
// ============================================================================

const formSchema = z.object({
  name: z.string().min(1, "Nazwa planu jest wymagana").max(100, "Nazwa nie może przekraczać 100 znaków"),
  effectiveFrom: z.date({
    required_error: "Data rozpoczęcia jest wymagana",
    invalid_type_error: "Nieprawidłowa data",
  }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts Date to YYYY-MM-DD format in local timezone
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gets suggested start date (day after plan end or today if later)
 */
function getSuggestedStartDate(planEndDate: string): Date {
  const endDate = new Date(planEndDate);
  const dayAfterEnd = new Date(endDate);
  dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dayAfterEnd > today ? dayAfterEnd : today;
}

// ============================================================================
// Main Component
// ============================================================================

export function ContinuePlanDialog({
  planId,
  currentPlanName,
  currentPlanEndDate,
  open,
  onOpenChange,
  onSuccess,
}: ContinuePlanDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Calculate default values
  const suggestedDate = getSuggestedStartDate(currentPlanEndDate);
  const suggestedName = `${currentPlanName} - Kontynuacja`;

  // Form setup
  const form = useForm<ContinuePlanFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: suggestedName,
      effectiveFrom: suggestedDate,
    },
  });

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setError(null);
        setIsSubmitting(false);
        form.reset({
          name: suggestedName,
          effectiveFrom: suggestedDate,
        });
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, form, suggestedName, suggestedDate]
  );

  // Submit handler
  const handleSubmit = useCallback(
    async (values: ContinuePlanFormData) => {
      if (!values.effectiveFrom) return;

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await continuePlan(planId, {
          effective_from: formatDateToISO(values.effectiveFrom),
          name: values.name,
        });

        // Success - close dialog and call success callback
        handleOpenChange(false);
        onSuccess?.(response.id);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        setIsSubmitting(false);
      }
    },
    [planId, handleOpenChange, onSuccess]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-5 text-primary" />
            Kontynuuj plan
          </DialogTitle>
          <DialogDescription>
            Skopiuj plan na nowy okres czasu. Zachowana zostanie struktura treningów bez modyfikacji AI.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Błąd</AlertTitle>
                <AlertDescription>
                  {error.error === "DateOverlapError" ? (
                    <span>
                      W wybranym okresie istnieje już inny aktywny plan. Zmień datę rozpoczęcia lub zarchiwizuj
                      kolidujący plan.
                    </span>
                  ) : (
                    <span>{error.message || "Nie udało się utworzyć kontynuacji planu. Spróbuj ponownie."}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa planu</FormLabel>
                  <FormControl>
                    <Input placeholder="Np. Plan Treningowy - Cykl 2" {...field} />
                  </FormControl>
                  <FormDescription>Podaj nazwę dla nowego planu (1-100 znaków)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date Field */}
            <FormField
              control={form.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data rozpoczęcia</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full pl-3 text-left font-normal" disabled={isSubmitting}>
                          {field.value ? (
                            format(field.value, "d MMMM yyyy", { locale: pl })
                          ) : (
                            <span className="text-muted-foreground">Wybierz datę</span>
                          )}
                          <CalendarIcon className="ml-auto size-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        locale={pl}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Kiedy ma rozpocząć się nowy cykl? (sugerowana:{" "}
                    {format(suggestedDate, "d MMMM yyyy", { locale: pl })})
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Tworzenie...
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Utwórz plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
