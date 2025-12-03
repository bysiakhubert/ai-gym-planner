import type { SupabaseClient } from "src/db/supabase.client";
import type { SessionStructure, SessionResponse } from "src/types";

/**
 * Represents a completed training session with performance data
 * Used for AI analysis when generating next cycle
 */
export interface CompletedSessionData {
  id: string;
  plan_id: string;
  date: string;
  day_name: string;
  exercises: SessionStructure["exercises"];
  started_at: string;
  ended_at: string | null;
}

/**
 * Custom error class for session-related errors
 */
export class NoSessionsError extends Error {
  constructor(planId: string) {
    super(`No completed sessions found for plan "${planId}"`);
    this.name = "NoSessionsError";
  }
}

/**
 * Service for managing training sessions
 * Handles CRUD operations and queries for session history
 */
export const sessionService = {
  /**
   * Fetches completed training sessions for a specific plan
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan to get sessions for
   * @param limit - Maximum number of sessions to return (default: 20)
   * @returns Array of completed session data for AI analysis
   * @throws {Error} If database operation fails
   */
  getCompletedSessions: async (
    supabase: SupabaseClient,
    userId: string,
    planId: string,
    limit = 20
  ): Promise<CompletedSessionData[]> => {
    // Fetch completed sessions (those with ended_at set) for the given plan
    // Select only necessary fields to minimize payload size
    const { data: sessions, error } = await supabase
      .from("training_sessions")
      .select("id, plan_id, session, started_at, ended_at")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .not("ended_at", "is", null) // Only completed sessions
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    // Transform database results to CompletedSessionData
    return (sessions ?? []).map((session) => {
      const sessionData = session.session as unknown as SessionStructure;
      return {
        id: session.id,
        plan_id: session.plan_id ?? "",
        date: sessionData.date,
        day_name: sessionData.day_name,
        exercises: sessionData.exercises,
        started_at: session.started_at,
        ended_at: session.ended_at,
      };
    });
  },

  /**
   * Checks if a plan has any completed sessions
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan to check
   * @returns true if the plan has at least one completed session
   * @throws {Error} If database operation fails
   */
  hasCompletedSessions: async (supabase: SupabaseClient, userId: string, planId: string): Promise<boolean> => {
    const { count, error } = await supabase
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .not("ended_at", "is", null);

    if (error) {
      throw new Error(`Failed to check sessions: ${error.message}`);
    }

    return (count ?? 0) > 0;
  },

  /**
   * Gets a single session by ID
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param sessionId - ID of the session to retrieve
   * @returns The session if found
   * @throws {Error} If session not found or database operation fails
   */
  getSessionById: async (supabase: SupabaseClient, userId: string, sessionId: string): Promise<SessionResponse> => {
    const { data: session, error } = await supabase
      .from("training_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error(`Session with id "${sessionId}" not found`);
      }
      throw new Error(`Failed to fetch session: ${error.message}`);
    }

    if (!session) {
      throw new Error(`Session with id "${sessionId}" not found`);
    }

    return {
      id: session.id,
      user_id: session.user_id,
      plan_id: session.plan_id,
      session: session.session as unknown as SessionStructure,
      started_at: session.started_at,
      ended_at: session.ended_at,
      created_at: session.created_at,
    };
  },
};
