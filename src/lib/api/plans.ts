/**
 * API client functions for training plans
 *
 * These functions handle communication with the plans API endpoints
 * and provide typed responses for the frontend components.
 */

import type {
  PaginatedPlansResponse,
  PlanResponse,
  ArchivePlanResponse,
  ApiError,
  ListPlansQueryParams,
  UpdatePlanRequest,
  GenerateNextCycleRequest,
  GenerateNextCycleResponse,
  CreatePlanRequest,
} from "@/types";

/**
 * Default pagination settings for plans list
 */
const DEFAULT_LIMIT = 20;

/**
 * Fetches a paginated list of training plans
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Promise resolving to paginated plans response
 * @throws ApiError when the request fails
 */
export async function fetchPlans(params: ListPlansQueryParams = {}): Promise<PaginatedPlansResponse> {
  const { limit = DEFAULT_LIMIT, offset = 0, sort = "effective_from", order = "desc" } = params;

  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort,
    order,
  });

  const response = await fetch(`/api/plans?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}

/**
 * Archives (soft deletes) a training plan
 *
 * @param planId - ID of the plan to archive
 * @returns Promise resolving to archive response with confirmation
 * @throws ApiError when the request fails
 */
export async function archivePlan(planId: string): Promise<ArchivePlanResponse> {
  const response = await fetch(`/api/plans/${planId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}

/**
 * Fetches a single training plan by ID
 *
 * @param planId - ID of the plan to fetch
 * @returns Promise resolving to full plan details
 * @throws ApiError when the request fails
 */
export async function fetchPlan(planId: string): Promise<PlanResponse> {
  const response = await fetch(`/api/plans/${planId}`);

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}

/**
 * Updates an existing training plan
 *
 * @param planId - ID of the plan to update
 * @param data - Updated plan data
 * @returns Promise resolving to updated plan details
 * @throws ApiError when the request fails
 */
export async function updatePlan(planId: string, data: UpdatePlanRequest): Promise<PlanResponse> {
  const response = await fetch(`/api/plans/${planId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}

/**
 * Generates a preview for the next training cycle based on performance history
 *
 * @param planId - ID of the source plan
 * @param data - Cycle generation parameters (duration, notes)
 * @returns Promise resolving to generated cycle preview with progression summary
 * @throws ApiError when the request fails (e.g., no sessions found)
 */
export async function generateNextCycle(
  planId: string,
  data: GenerateNextCycleRequest
): Promise<GenerateNextCycleResponse> {
  const response = await fetch(`/api/plans/${planId}/generate-next`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}

/**
 * Creates a new training plan
 *
 * @param data - Plan creation data
 * @returns Promise resolving to created plan details
 * @throws ApiError when the request fails
 */
export async function createPlan(data: CreatePlanRequest): Promise<PlanResponse> {
  const response = await fetch("/api/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}
