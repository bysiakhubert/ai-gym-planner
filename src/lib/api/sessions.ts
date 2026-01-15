/**
 * API client functions for training sessions
 *
 * These functions handle communication with the sessions API endpoints
 * and provide typed responses for the frontend components.
 */

import type {
  SessionResponse,
  UpdateSessionRequest,
  CompleteSessionRequest,
  ApiError,
  PaginatedSessionsResponse,
  ListSessionsQueryParams,
} from "@/types";

/**
 * Fetches a single session by ID
 *
 * @param sessionId - ID of the session to fetch
 * @returns Promise resolving to full session details
 * @throws ApiError when the request fails
 */
export async function fetchSession(sessionId: string): Promise<SessionResponse> {
  const response = await fetch(`/api/sessions/${sessionId}`);

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}

/**
 * Fetches the current active (uncompleted) session for the user
 *
 * @returns Promise resolving to active session or null if none exists
 * @throws ApiError when the request fails
 */
export async function fetchActiveSession(): Promise<SessionResponse | null> {
  const params = new URLSearchParams({
    completed: "false",
    limit: "1",
    sort: "started_at",
    order: "desc",
  });

  const response = await fetch(`/api/sessions?${params.toString()}`);

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  const data: PaginatedSessionsResponse = await response.json();

  if (data.sessions.length === 0) {
    return null;
  }

  // Fetch full session details since list returns only summary
  return fetchSession(data.sessions[0].id);
}

/**
 * Updates an in-progress training session (autosave)
 *
 * @param sessionId - ID of the session to update
 * @param data - Updated session data
 * @returns Promise resolving to updated session details
 * @throws ApiError when the request fails
 */
export async function updateSession(sessionId: string, data: UpdateSessionRequest): Promise<SessionResponse> {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    method: "PATCH",
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
 * Completes a training session
 *
 * @param sessionId - ID of the session to complete
 * @param data - Optional final session data update
 * @returns Promise resolving to completed session details
 * @throws ApiError when the request fails
 */
export async function completeSession(sessionId: string, data?: CompleteSessionRequest): Promise<SessionResponse> {
  const response = await fetch(`/api/sessions/${sessionId}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data ?? {}),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}

/**
 * Fetches a paginated list of training sessions
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Promise resolving to paginated sessions response
 * @throws ApiError when the request fails
 */
export async function fetchSessions(params: ListSessionsQueryParams = {}): Promise<PaginatedSessionsResponse> {
  const searchParams = new URLSearchParams();

  if (params.plan_id) searchParams.set("plan_id", params.plan_id);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  if (params.completed !== undefined) searchParams.set("completed", String(params.completed));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.order) searchParams.set("order", params.order);

  const response = await fetch(`/api/sessions?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw errorData;
  }

  return response.json();
}
