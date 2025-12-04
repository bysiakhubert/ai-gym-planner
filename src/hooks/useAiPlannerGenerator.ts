import { useState, useEffect } from "react";
import { toast } from "sonner";
import type {
  GeneratePlanRequest,
  GeneratePlanResponse,
  CreatePlanRequest,
  PlanResponse,
  UserPreferences,
  ApiError,
} from "@/types";

type ViewState = "form" | "loading" | "preview" | "error";

const LOCALSTORAGE_KEY = "ai_planner_preview";

export function useAiPlannerGenerator() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [previewData, setPreviewData] = useState<GeneratePlanResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load preview from localStorage on mount
  useEffect(() => {
    const savedPreview = localStorage.getItem(LOCALSTORAGE_KEY);
    if (savedPreview) {
      try {
        const parsed = JSON.parse(savedPreview) as GeneratePlanResponse;
        setPreviewData(parsed);
        setViewState("preview");
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to parse saved preview:", e);
        localStorage.removeItem(LOCALSTORAGE_KEY);
      }
    }
  }, []);

  // Generate plan preview
  const generatePlan = async (preferences: UserPreferences) => {
    setViewState("loading");
    setError(null);

    const toastId = toast.loading("Generowanie planu treningowego...");

    try {
      const requestBody: GeneratePlanRequest = { preferences };

      const response = await fetch("/api/plans/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw errorData;
      }

      const data: GeneratePlanResponse = await response.json();

      // Save to localStorage
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));

      setPreviewData(data);
      setViewState("preview");

      toast.success("Plan został wygenerowany pomyślnie!", { id: toastId });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error generating plan:", err);
      const apiError = err as ApiError;
      setError(apiError);
      setViewState("error");

      toast.error(apiError.message || "Nie udało się wygenerować planu", { id: toastId });
    }
  };

  // Accept and save plan
  const acceptPlan = async () => {
    if (!previewData) return;

    setIsSaving(true);
    setError(null);

    const toastId = toast.loading("Zapisywanie planu...");

    try {
      const { plan, preferences } = previewData;

      const requestBody: CreatePlanRequest = {
        name: plan.name,
        effective_from: plan.effective_from,
        effective_to: plan.effective_to,
        source: "ai",
        prompt: null,
        preferences: preferences,
        plan: { schedule: plan.schedule },
      };

      const response = await fetch("/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw errorData;
      }

      const savedPlan: PlanResponse = await response.json();

      // Clear localStorage after successful save
      localStorage.removeItem(LOCALSTORAGE_KEY);

      toast.success("Plan został zapisany pomyślnie!", { id: toastId });

      // Redirect to plans list after short delay
      setTimeout(() => {
        window.location.href = "/plans";
      }, 1000);

      return savedPlan;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error saving plan:", err);
      const apiError = err as ApiError;
      setError(apiError);
      setIsSaving(false);

      toast.error(apiError.message || "Nie udało się zapisać planu", { id: toastId });
    }
  };

  // Reject plan and return to form
  const rejectPlan = () => {
    localStorage.removeItem(LOCALSTORAGE_KEY);
    setPreviewData(null);
    setError(null);
    setViewState("form");
    toast.info("Plan został odrzucony");
  };

  // Edit plan (redirect to edit view)
  const editPlan = () => {
    if (!previewData) return;

    // Store preview data for edit view
    localStorage.setItem("plan_to_edit", JSON.stringify(previewData));

    // Redirect to new plan edit view
    window.location.href = "/plans/new/edit";
  };

  return {
    viewState,
    previewData,
    error,
    isSaving,
    generatePlan,
    acceptPlan,
    rejectPlan,
    editPlan,
  };
}
