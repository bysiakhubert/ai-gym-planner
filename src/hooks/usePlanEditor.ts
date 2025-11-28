/**
 * Custom hook for managing plan editor state and operations
 *
 * Handles fetching plan data, transforming between API and form formats,
 * and saving updates with proper loading and error states.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { PlanResponse, UpdatePlanRequest, ApiError, PlanStructure } from "@/types";
import type { PlanEditorFormValues, DayFormValues } from "@/lib/schemas/plan-editor";
import { fetchPlan, updatePlan } from "@/lib/api/plans";

/**
 * State shape returned by the usePlanEditor hook
 */
interface UsePlanEditorState {
  plan: PlanResponse | null;
  isLoading: boolean;
  isSaving: boolean;
  error: ApiError | null;
}

/**
 * Actions available from the usePlanEditor hook
 */
interface UsePlanEditorActions {
  loadPlan: (planId: string) => Promise<PlanResponse | null>;
  savePlan: (planId: string, formValues: PlanEditorFormValues) => Promise<PlanResponse | null>;
  transformApiToForm: (plan: PlanResponse) => PlanEditorFormValues;
  transformFormToApi: (formValues: PlanEditorFormValues, existingPlan: PlanResponse) => UpdatePlanRequest;
}

type UsePlanEditorReturn = UsePlanEditorState & UsePlanEditorActions;

/**
 * Transforms API plan data (Record-based schedule) to form values (array-based days)
 *
 * @param plan - Plan response from API with schedule as Record
 * @returns Form values with days as sorted array
 */
function apiToFormTransformer(plan: PlanResponse): PlanEditorFormValues {
  // Extract schedule entries and sort by date
  const scheduleEntries = Object.entries(plan.plan.schedule);
  const sortedEntries = scheduleEntries.sort(([dateA], [dateB]) => dateA.localeCompare(dateB));

  // Transform to form days array
  const days: DayFormValues[] = sortedEntries.map(([date, workoutDay]) => ({
    date,
    name: workoutDay.name,
    exercises: workoutDay.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight ?? null,
        rest_seconds: set.rest_seconds,
      })),
    })),
  }));

  // Format dates for form (extract date part from ISO timestamp)
  const effectiveFrom = plan.effective_from.split("T")[0];
  const effectiveTo = plan.effective_to.split("T")[0];

  return {
    name: plan.name,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    days,
  };
}

/**
 * Transforms form values (array-based days) to API request format (Record-based schedule)
 *
 * @param formValues - Form values with days as array
 * @param existingPlan - Existing plan data to preserve unchanged fields
 * @returns Update request with schedule as Record
 */
function formToApiTransformer(formValues: PlanEditorFormValues, existingPlan: PlanResponse): UpdatePlanRequest {
  // Transform days array back to schedule Record
  const schedule: PlanStructure["schedule"] = {};

  for (const day of formValues.days) {
    // Check if this date existed in the original plan to preserve 'done' status
    const originalDay = existingPlan.plan.schedule[day.date];
    const isDone = originalDay?.done ?? false;

    schedule[day.date] = {
      name: day.name,
      exercises: day.exercises.map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          reps: set.reps,
          weight: set.weight ?? undefined,
          rest_seconds: set.rest_seconds,
        })),
      })),
      done: isDone,
    };
  }

  // Convert date strings to ISO timestamps
  const effectiveFrom = new Date(formValues.effective_from).toISOString();
  const effectiveTo = new Date(formValues.effective_to).toISOString();

  return {
    name: formValues.name,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    source: existingPlan.source as "ai" | "manual",
    prompt: existingPlan.prompt,
    preferences: existingPlan.preferences,
    plan: { schedule },
  };
}

/**
 * Hook for managing plan editor operations
 *
 * @returns State and actions for plan editing
 */
export function usePlanEditor(): UsePlanEditorReturn {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Loads plan data from the API
   */
  const loadPlan = useCallback(async (planId: string): Promise<PlanResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchPlan(planId);
      setPlan(response);
      return response;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      // eslint-disable-next-line no-console
      console.error("Failed to load plan:", apiError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Saves plan updates to the API
   */
  const savePlan = useCallback(
    async (planId: string, formValues: PlanEditorFormValues): Promise<PlanResponse | null> => {
      if (!plan) {
        toast.error("Nie można zapisać planu - brak danych");
        return null;
      }

      setIsSaving(true);
      const toastId = toast.loading("Zapisywanie planu...");

      try {
        const updateRequest = formToApiTransformer(formValues, plan);
        const updatedPlan = await updatePlan(planId, updateRequest);

        setPlan(updatedPlan);
        toast.success("Plan został zaktualizowany", { id: toastId });

        return updatedPlan;
      } catch (err) {
        const apiError = err as ApiError;
        // eslint-disable-next-line no-console
        console.error("Failed to save plan:", apiError);

        const errorMessage =
          apiError.error === "DateOverlapError"
            ? "Daty planu nakładają się z innym planem"
            : apiError.message || "Nie udało się zapisać planu";

        toast.error(errorMessage, { id: toastId });
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [plan]
  );

  /**
   * Exposes the API to form transformer
   */
  const transformApiToForm = useCallback((planData: PlanResponse): PlanEditorFormValues => {
    return apiToFormTransformer(planData);
  }, []);

  /**
   * Exposes the form to API transformer
   */
  const transformFormToApi = useCallback(
    (formValues: PlanEditorFormValues, existingPlan: PlanResponse): UpdatePlanRequest => {
      return formToApiTransformer(formValues, existingPlan);
    },
    []
  );

  return {
    plan,
    isLoading,
    isSaving,
    error,
    loadPlan,
    savePlan,
    transformApiToForm,
    transformFormToApi,
  };
}

