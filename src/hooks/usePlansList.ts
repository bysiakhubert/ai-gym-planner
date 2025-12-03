/**
 * Custom hook for managing plans list state and operations
 *
 * Handles fetching, pagination, and archiving of training plans
 * with proper loading and error states.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { PlanSummary, PaginationMeta, ApiError } from "@/types";
import { fetchPlans, archivePlan } from "@/lib/api/plans";

/**
 * Plan status calculated on the client side based on dates
 */
export type PlanStatus = "active" | "upcoming" | "completed";

/**
 * Extended plan model with UI-specific properties
 */
export interface PlanUiModel extends PlanSummary {
  status: PlanStatus;
}

/**
 * State shape returned by the usePlansList hook
 */
interface UsePlansListState {
  plans: PlanUiModel[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: ApiError | null;
  planToArchive: PlanSummary | null;
  isArchiving: boolean;
}

/**
 * Actions available from the usePlansList hook
 */
interface UsePlansListActions {
  loadMore: () => Promise<void>;
  openArchiveDialog: (plan: PlanSummary) => void;
  closeArchiveDialog: () => void;
  confirmArchive: () => Promise<void>;
  retry: () => Promise<void>;
}

type UsePlansListReturn = UsePlansListState & UsePlansListActions;

const DEFAULT_LIMIT = 20;

/**
 * Calculates plan status based on effective dates
 *
 * @param effectiveFrom - Plan start date (ISO string)
 * @param effectiveTo - Plan end date (ISO string)
 * @returns Calculated plan status
 */
function calculatePlanStatus(effectiveFrom: string, effectiveTo: string): PlanStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fromDate = new Date(effectiveFrom);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(effectiveTo);
  toDate.setHours(0, 0, 0, 0);

  if (today < fromDate) {
    return "upcoming";
  }

  if (today > toDate) {
    return "completed";
  }

  return "active";
}

/**
 * Transforms PlanSummary to PlanUiModel with calculated status
 */
function transformToPlanUiModel(plan: PlanSummary): PlanUiModel {
  return {
    ...plan,
    status: calculatePlanStatus(plan.effective_from, plan.effective_to),
  };
}

/**
 * Hook for managing plans list with pagination and archive functionality
 *
 * @returns State and actions for plans list management
 */
export function usePlansList(): UsePlansListReturn {
  const [plans, setPlans] = useState<PlanUiModel[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [planToArchive, setPlanToArchive] = useState<PlanSummary | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  /**
   * Fetches plans from the API with given offset
   */
  const fetchPlansData = useCallback(async (offset: number, append = false) => {
    try {
      const response = await fetchPlans({
        limit: DEFAULT_LIMIT,
        offset,
        sort: "effective_from",
        order: "desc",
      });

      const transformedPlans = response.plans.map(transformToPlanUiModel);

      if (append) {
        setPlans((prev) => [...prev, ...transformedPlans]);
      } else {
        setPlans(transformedPlans);
      }

      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      // eslint-disable-next-line no-console
      console.error("Failed to fetch plans:", apiError);
    }
  }, []);

  /**
   * Initial data fetch on mount
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchPlansData(0, false);
      setIsLoading(false);
    };

    loadInitialData();
  }, [fetchPlansData]);

  /**
   * Loads more plans (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!pagination || !pagination.has_more || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    const newOffset = pagination.offset + DEFAULT_LIMIT;
    await fetchPlansData(newOffset, true);
    setIsLoadingMore(false);
  }, [pagination, isLoadingMore, fetchPlansData]);

  /**
   * Opens the archive confirmation dialog
   */
  const openArchiveDialog = useCallback((plan: PlanSummary) => {
    setPlanToArchive(plan);
  }, []);

  /**
   * Closes the archive confirmation dialog
   */
  const closeArchiveDialog = useCallback(() => {
    setPlanToArchive(null);
  }, []);

  /**
   * Confirms and executes plan archiving
   */
  const confirmArchive = useCallback(async () => {
    if (!planToArchive) return;

    setIsArchiving(true);
    const toastId = toast.loading("Archiwizowanie planu...");

    try {
      await archivePlan(planToArchive.id);

      // Remove the archived plan from the local state
      setPlans((prev) => prev.filter((p) => p.id !== planToArchive.id));

      // Update pagination total
      if (pagination) {
        setPagination({
          ...pagination,
          total: pagination.total - 1,
        });
      }

      toast.success("Plan został zarchiwizowany", { id: toastId });
      setPlanToArchive(null);
    } catch (err) {
      const apiError = err as ApiError;
      // eslint-disable-next-line no-console
      console.error("Failed to archive plan:", apiError);
      toast.error(apiError.message || "Nie udało się zarchiwizować planu", { id: toastId });
    } finally {
      setIsArchiving(false);
    }
  }, [planToArchive, pagination]);

  /**
   * Retries fetching plans after an error
   */
  const retry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await fetchPlansData(0, false);
    setIsLoading(false);
  }, [fetchPlansData]);

  return {
    plans,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    planToArchive,
    isArchiving,
    loadMore,
    openArchiveDialog,
    closeArchiveDialog,
    confirmArchive,
    retry,
  };
}
