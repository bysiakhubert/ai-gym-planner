/**
 * Custom hook for managing plan editor state and operations
 *
 * Handles fetching plan data, transforming between API and form formats,
 * and saving updates with proper loading and error states.
 *
 * Supports two modes:
 * - Edit mode: editing an existing plan by ID
 * - Create mode: editing a new plan from localStorage before saving
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type {
  PlanResponse,
  UpdatePlanRequest,
  CreatePlanRequest,
  ApiError,
  PlanStructure,
  GeneratePlanResponse,
  UserPreferences,
} from "@/types";
import type { PlanEditorFormValues, DayFormValues } from "@/lib/schemas/plan-editor";
import { fetchPlan, updatePlan, createPlan } from "@/lib/api/plans";

const LOCALSTORAGE_KEY_EDIT = "plan_to_edit";
const LOCALSTORAGE_KEY_PREVIEW = "ai_planner_preview";

/**
 * Editor mode - determines if we're editing existing plan or creating new one
 */
type EditorMode = "edit" | "create";

/**
 * Initial data structure for create mode (from AI generation)
 */
interface InitialPlanData {
  name: string;
  effective_from: string;
  effective_to: string;
  schedule: PlanStructure["schedule"];
  preferences: UserPreferences;
  source: "ai" | "manual";
}

/**
 * State shape returned by the usePlanEditor hook
 */
interface UsePlanEditorState {
  plan: PlanResponse | null;
  initialData: InitialPlanData | null;
  mode: EditorMode;
  isLoading: boolean;
  isSaving: boolean;
  error: ApiError | null;
}

/**
 * Actions available from the usePlanEditor hook
 */
interface UsePlanEditorActions {
  loadPlan: (planId: string) => Promise<PlanResponse | null>;
  loadFromLocalStorage: () => InitialPlanData | null;
  savePlan: (planId: string | null, formValues: PlanEditorFormValues) => Promise<PlanResponse | null>;
  transformApiToForm: (plan: PlanResponse) => PlanEditorFormValues;
  transformInitialDataToForm: (data: InitialPlanData) => PlanEditorFormValues;
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
 * Transforms initial data (from AI generation) to form values
 *
 * @param data - Initial plan data from localStorage
 * @returns Form values with days as sorted array
 */
function initialDataToFormTransformer(data: InitialPlanData): PlanEditorFormValues {
  // Extract schedule entries and sort by date
  const scheduleEntries = Object.entries(data.schedule);
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

  // Format dates (extract date part if ISO timestamp)
  const effectiveFrom = data.effective_from.split("T")[0];
  const effectiveTo = data.effective_to.split("T")[0];

  return {
    name: data.name,
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
 * Transforms form values to CreatePlanRequest for new plans
 *
 * @param formValues - Form values with days as array
 * @param initialData - Initial data with preferences and source
 * @returns Create request for new plan
 */
function formToCreateRequestTransformer(
  formValues: PlanEditorFormValues,
  initialData: InitialPlanData
): CreatePlanRequest {
  // Transform days array to schedule Record
  const schedule: PlanStructure["schedule"] = {};

  for (const day of formValues.days) {
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
      done: false,
    };
  }

  // Convert date strings to ISO timestamps
  const effectiveFrom = new Date(formValues.effective_from).toISOString();
  const effectiveTo = new Date(formValues.effective_to).toISOString();

  return {
    name: formValues.name,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    source: initialData.source,
    prompt: null,
    preferences: initialData.preferences,
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
  const [initialData, setInitialData] = useState<InitialPlanData | null>(null);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Loads plan data from the API (edit mode)
   */
  const loadPlan = useCallback(async (planId: string): Promise<PlanResponse | null> => {
    setIsLoading(true);
    setError(null);
    setMode("edit");

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
   * Loads plan data from localStorage (create mode)
   * Used when editing a generated plan before saving
   */
  const loadFromLocalStorage = useCallback((): InitialPlanData | null => {
    setIsLoading(true);
    setError(null);
    setMode("create");

    try {
      // Try plan_to_edit key first (set by editPlan function)
      let savedData = localStorage.getItem(LOCALSTORAGE_KEY_EDIT);

      // Fall back to ai_planner_preview key
      if (!savedData) {
        savedData = localStorage.getItem(LOCALSTORAGE_KEY_PREVIEW);
      }

      if (!savedData) {
        setError({
          error: "NotFound",
          message: "Nie znaleziono danych planu do edycji",
        });
        return null;
      }

      const parsed = JSON.parse(savedData) as GeneratePlanResponse;

      // Transform GeneratePlanResponse to InitialPlanData
      const data: InitialPlanData = {
        name: parsed.plan.name,
        effective_from: parsed.plan.effective_from,
        effective_to: parsed.plan.effective_to,
        schedule: parsed.plan.schedule,
        preferences: parsed.preferences,
        source: "ai",
      };

      setInitialData(data);
      return data;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to parse saved preview:", err);
      setError({
        error: "ValidationError",
        message: "Nie udało się wczytać danych planu",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Saves plan - creates new or updates existing depending on mode
   */
  const savePlan = useCallback(
    async (planId: string | null, formValues: PlanEditorFormValues): Promise<PlanResponse | null> => {
      setIsSaving(true);
      const toastId = toast.loading("Zapisywanie planu...");

      try {
        let savedPlan: PlanResponse;

        if (mode === "create" && initialData) {
          // Create new plan
          const createRequest = formToCreateRequestTransformer(formValues, initialData);
          savedPlan = await createPlan(createRequest);

          // Clear localStorage after successful save
          localStorage.removeItem(LOCALSTORAGE_KEY_EDIT);
          localStorage.removeItem(LOCALSTORAGE_KEY_PREVIEW);

          toast.success("Plan został utworzony", { id: toastId });
        } else if (plan && planId) {
          // Update existing plan
          const updateRequest = formToApiTransformer(formValues, plan);
          savedPlan = await updatePlan(planId, updateRequest);

          setPlan(savedPlan);
          toast.success("Plan został zaktualizowany", { id: toastId });
        } else {
          toast.error("Nie można zapisać planu - brak danych", { id: toastId });
          return null;
        }

        return savedPlan;
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
    [mode, plan, initialData]
  );

  /**
   * Exposes the API to form transformer
   */
  const transformApiToForm = useCallback((planData: PlanResponse): PlanEditorFormValues => {
    return apiToFormTransformer(planData);
  }, []);

  /**
   * Exposes the initial data to form transformer
   */
  const transformInitialDataToForm = useCallback((data: InitialPlanData): PlanEditorFormValues => {
    return initialDataToFormTransformer(data);
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
    initialData,
    mode,
    isLoading,
    isSaving,
    error,
    loadPlan,
    loadFromLocalStorage,
    savePlan,
    transformApiToForm,
    transformInitialDataToForm,
    transformFormToApi,
  };
}
