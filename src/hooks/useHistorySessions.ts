/* eslint-disable react-compiler/react-compiler */
import { useState, useEffect, useCallback } from "react";
import type { SessionSummary, PaginationMeta, ListSessionsQueryParams } from "@/types";
import { fetchSessions } from "@/lib/api/sessions";

/**
 * Default number of sessions to fetch per page
 */
const DEFAULT_LIMIT = 20;

/**
 * Return type for useHistorySessions hook
 */
export interface UseHistorySessionsReturn {
  sessions: SessionSummary[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Custom hook for managing history sessions list with pagination
 * Fetches only completed training sessions
 *
 * @returns Session list state and control functions
 */
export function useHistorySessions(): UseHistorySessionsReturn {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  /**
   * Load sessions from API
   * @param reset - If true, clears current list and fetches from offset 0
   */
  const loadSessions = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : (pagination?.offset ?? 0) + DEFAULT_LIMIT;

      if (reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params: ListSessionsQueryParams = {
          completed: true,
          limit: DEFAULT_LIMIT,
          offset: reset ? 0 : currentOffset,
          sort: "started_at",
          order: "desc",
        };

        const response = await fetchSessions(params);

        if (reset) {
          setSessions(response.sessions);
        } else {
          setSessions((prev) => [...prev, ...response.sessions]);
        }

        setPagination(response.pagination);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Błąd pobierania historii treningów";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [pagination?.offset]
  );

  /**
   * Initial data fetch on mount
   */
  useEffect(() => {
    loadSessions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ^ Intentionally empty deps - only run on mount

  /**
   * Load next page of sessions
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !pagination?.has_more) return;
    await loadSessions(false);
  }, [isLoadingMore, pagination?.has_more, loadSessions]);

  /**
   * Retry fetching sessions after error
   */
  const retry = useCallback(async () => {
    await loadSessions(true);
  }, [loadSessions]);

  const hasMore = pagination?.has_more ?? false;

  return {
    sessions,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    hasMore,
    loadMore,
    retry,
  };
}
