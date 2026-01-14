import type { SupabaseClient } from "src/db/supabase.client";
import type {
  SessionStructure,
  SessionResponse,
  SessionSummary,
  PaginatedSessionsResponse,
  ListSessionsQueryParams,
  CreateSessionRequest,
  UpdateSessionRequest,
} from "src/types";
import type { Json } from "src/db/database.types";
import { auditLogService } from "./auditLogService";

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
 * Custom error class for session not found
 */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session with id "${sessionId}" not found`);
    this.name = "SessionNotFoundError";
  }
}

/**
 * Custom error class for active session conflict
 */
export class ActiveSessionConflictError extends Error {
  constructor() {
    super("An in-progress session already exists");
    this.name = "ActiveSessionConflictError";
  }
}

/**
 * Custom error class for attempting to update a completed session
 */
export class SessionCompletedError extends Error {
  constructor(sessionId: string) {
    super(`Cannot update completed session "${sessionId}"`);
    this.name = "SessionCompletedError";
  }
}

/**
 * Custom error class for plan not found or not owned
 */
export class PlanAccessDeniedError extends Error {
  constructor(planId: string) {
    super(`Plan "${planId}" not found or access denied`);
    this.name = "PlanAccessDeniedError";
  }
}

/**
 * Custom error class for attempting to start an already completed workout
 */
export class WorkoutAlreadyCompletedError extends Error {
  constructor(date: string) {
    super(`Workout for date "${date}" has already been completed`);
    this.name = "WorkoutAlreadyCompletedError";
  }
}

/**
 * Service for managing training sessions
 * Handles CRUD operations and queries for session history
 */
export const sessionService = {
  /**
   * Creates a new training session
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param data - Session creation data
   * @returns The newly created session
   * @throws {ActiveSessionConflictError} If user already has an in-progress session
   * @throws {PlanAccessDeniedError} If plan doesn't exist or doesn't belong to user
   * @throws {WorkoutAlreadyCompletedError} If workout day is already marked as done
   * @throws {Error} If database operation fails
   */
  create: async (supabase: SupabaseClient, userId: string, data: CreateSessionRequest): Promise<SessionResponse> => {
    // Step 1: Check for existing active session (ended_at IS NULL)
    const { data: activeSession, error: activeCheckError } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("user_id", userId)
      .is("ended_at", null)
      .maybeSingle();

    if (activeCheckError) {
      throw new Error(`Failed to check for active sessions: ${activeCheckError.message}`);
    }

    if (activeSession) {
      throw new ActiveSessionConflictError();
    }

    // Step 2: Verify plan ownership
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, name, plan")
      .eq("id", data.plan_id)
      .eq("user_id", userId)
      .eq("archived", false)
      .maybeSingle();

    if (planError) {
      throw new Error(`Failed to verify plan: ${planError.message}`);
    }

    if (!plan) {
      throw new PlanAccessDeniedError(data.plan_id);
    }

    // Step 3: Check if workout day is already completed
    const planData = plan.plan as unknown as { schedule: Record<string, { done?: boolean }> };
    if (planData.schedule?.[data.date]?.done === true) {
      throw new WorkoutAlreadyCompletedError(data.date);
    }

    // Step 4: Create the session insert object
    const sessionInsert = {
      user_id: userId,
      plan_id: data.plan_id,
      session: data.session as unknown as Json,
      started_at: new Date().toISOString(),
    };

    // Step 5: Insert the session into the database
    const { data: newSession, error: insertError } = await supabase
      .from("training_sessions")
      .insert(sessionInsert)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create session: ${insertError.message}`);
    }

    if (!newSession) {
      throw new Error("Session was not returned after creation");
    }

    // Step 6: Log audit event
    await auditLogService.logEvent(supabase, userId, "session_started", {
      entityType: "session",
      entityId: newSession.id,
      payload: {
        plan_id: data.plan_id,
        plan_name: plan.name,
        day_name: data.session.day_name,
        date: data.date,
      },
    });

    // Step 7: Return the created session as SessionResponse
    return {
      id: newSession.id,
      user_id: newSession.user_id,
      plan_id: newSession.plan_id,
      session: newSession.session as unknown as SessionStructure,
      started_at: newSession.started_at,
      ended_at: newSession.ended_at,
      created_at: newSession.created_at,
    };
  },

  /**
   * Updates an in-progress training session
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param sessionId - ID of the session to update
   * @param data - Session update data
   * @returns The updated session
   * @throws {SessionNotFoundError} If session doesn't exist or doesn't belong to user
   * @throws {SessionCompletedError} If session is already completed
   * @throws {Error} If database operation fails
   */
  update: async (
    supabase: SupabaseClient,
    userId: string,
    sessionId: string,
    data: UpdateSessionRequest
  ): Promise<SessionResponse> => {
    // Step 1: Verify session exists, belongs to user, and is active
    const { data: existingSession, error: checkError } = await supabase
      .from("training_sessions")
      .select("id, ended_at")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Failed to verify session: ${checkError.message}`);
    }

    if (!existingSession) {
      throw new SessionNotFoundError(sessionId);
    }

    if (existingSession.ended_at !== null) {
      throw new SessionCompletedError(sessionId);
    }

    // Step 2: Update the session
    const { data: updatedSession, error: updateError } = await supabase
      .from("training_sessions")
      .update({ session: data.session as unknown as Json })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`);
    }

    if (!updatedSession) {
      throw new Error("Session was not returned after update");
    }

    // Step 3: Return the updated session as SessionResponse
    return {
      id: updatedSession.id,
      user_id: updatedSession.user_id,
      plan_id: updatedSession.plan_id,
      session: updatedSession.session as unknown as SessionStructure,
      started_at: updatedSession.started_at,
      ended_at: updatedSession.ended_at,
      created_at: updatedSession.created_at,
    };
  },

  /**
   * Completes a training session
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param sessionId - ID of the session to complete
   * @param finalSession - Optional final session data update
   * @returns The completed session
   * @throws {SessionNotFoundError} If session doesn't exist or doesn't belong to user
   * @throws {SessionCompletedError} If session is already completed
   * @throws {Error} If database operation fails
   */
  complete: async (
    supabase: SupabaseClient,
    userId: string,
    sessionId: string,
    finalSession?: SessionStructure
  ): Promise<SessionResponse> => {
    // Step 1: Verify session exists, belongs to user, and is active
    const { data: existingSession, error: checkError } = await supabase
      .from("training_sessions")
      .select("id, plan_id, session, ended_at")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Failed to verify session: ${checkError.message}`);
    }

    if (!existingSession) {
      throw new SessionNotFoundError(sessionId);
    }

    if (existingSession.ended_at !== null) {
      throw new SessionCompletedError(sessionId);
    }

    // Step 2: Prepare update object
    const updateData: { session?: Json; ended_at: string } = {
      ended_at: new Date().toISOString(),
    };

    if (finalSession) {
      updateData.session = finalSession as unknown as Json;
    }

    // Step 3: Update the session with ended_at
    const { data: completedSession, error: updateError } = await supabase
      .from("training_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to complete session: ${updateError.message}`);
    }

    if (!completedSession) {
      throw new Error("Session was not returned after completion");
    }

    // Step 4: Mark workout day as done in the plan
    const sessionData = completedSession.session as unknown as SessionStructure;
    if (completedSession.plan_id) {
      await sessionService.markWorkoutDayAsDone(supabase, userId, completedSession.plan_id, sessionData.date);
    }

    // Step 5: Log audit event
    await auditLogService.logEvent(supabase, userId, "session_completed", {
      entityType: "session",
      entityId: completedSession.id,
      payload: {
        plan_id: completedSession.plan_id,
        plan_name: sessionData.plan_name,
        day_name: sessionData.day_name,
        date: sessionData.date,
        started_at: completedSession.started_at,
        ended_at: completedSession.ended_at,
      },
    });

    // Step 6: Return the completed session as SessionResponse
    return {
      id: completedSession.id,
      user_id: completedSession.user_id,
      plan_id: completedSession.plan_id,
      session: completedSession.session as unknown as SessionStructure,
      started_at: completedSession.started_at,
      ended_at: completedSession.ended_at,
      created_at: completedSession.created_at,
    };
  },

  /**
   * Gets a single session by ID
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param sessionId - ID of the session to retrieve
   * @returns The session if found
   * @throws {SessionNotFoundError} If session not found or doesn't belong to user
   * @throws {Error} If database operation fails
   */
  getById: async (supabase: SupabaseClient, userId: string, sessionId: string): Promise<SessionResponse> => {
    const { data: session, error } = await supabase
      .from("training_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch session: ${error.message}`);
    }

    if (!session) {
      throw new SessionNotFoundError(sessionId);
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

  /**
   * Lists sessions for a user with pagination and filtering
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param params - Query parameters for pagination, sorting, and filtering
   * @returns Paginated list of session summaries
   * @throws {Error} If database operation fails
   */
  list: async (
    supabase: SupabaseClient,
    userId: string,
    params: ListSessionsQueryParams
  ): Promise<PaginatedSessionsResponse> => {
    const {
      plan_id,
      date_from,
      date_to,
      completed,
      limit = 20,
      offset = 0,
      sort = "started_at",
      order = "desc",
    } = params;

    // Build the base query for counting
    let countQuery = supabase
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Build the base query for fetching data
    let dataQuery = supabase
      .from("training_sessions")
      .select("id, plan_id, session, started_at, ended_at")
      .eq("user_id", userId);

    // Apply filters
    if (plan_id) {
      countQuery = countQuery.eq("plan_id", plan_id);
      dataQuery = dataQuery.eq("plan_id", plan_id);
    }

    if (date_from) {
      countQuery = countQuery.gte("started_at", `${date_from}T00:00:00.000Z`);
      dataQuery = dataQuery.gte("started_at", `${date_from}T00:00:00.000Z`);
    }

    if (date_to) {
      countQuery = countQuery.lte("started_at", `${date_to}T23:59:59.999Z`);
      dataQuery = dataQuery.lte("started_at", `${date_to}T23:59:59.999Z`);
    }

    if (completed !== undefined) {
      if (completed) {
        countQuery = countQuery.not("ended_at", "is", null);
        dataQuery = dataQuery.not("ended_at", "is", null);
      } else {
        countQuery = countQuery.is("ended_at", null);
        dataQuery = dataQuery.is("ended_at", null);
      }
    }

    // Get total count
    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count sessions: ${countError.message}`);
    }

    const total = count ?? 0;

    // Fetch sessions with sorting and pagination
    const { data: sessions, error: fetchError } = await dataQuery
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch sessions: ${fetchError.message}`);
    }

    // Transform database results to SessionSummary type
    const sessionSummaries: SessionSummary[] = (sessions ?? []).map((session) => {
      const sessionData = session.session as unknown as SessionStructure;

      // Calculate duration in minutes if completed
      let durationMinutes: number | null = null;
      if (session.ended_at) {
        const startTime = new Date(session.started_at).getTime();
        const endTime = new Date(session.ended_at).getTime();
        durationMinutes = Math.round((endTime - startTime) / 60000);
      }

      // Calculate completed sets vs total sets
      let completedSets = 0;
      let totalSets = 0;
      for (const exercise of sessionData.exercises) {
        for (const set of exercise.sets) {
          totalSets++;
          if (set.completed) {
            completedSets++;
          }
        }
      }

      return {
        id: session.id,
        plan_id: session.plan_id,
        plan_name: sessionData.plan_name,
        day_name: sessionData.day_name,
        date: sessionData.date,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_minutes: durationMinutes,
        completed_sets: completedSets,
        total_sets: totalSets,
      };
    });

    return {
      sessions: sessionSummaries,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + sessionSummaries.length < total,
      },
    };
  },

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
   * Gets a single session by ID (legacy method - use getById instead)
   *
   * @deprecated Use getById instead
   */
  getSessionById: async (supabase: SupabaseClient, userId: string, sessionId: string): Promise<SessionResponse> => {
    return sessionService.getById(supabase, userId, sessionId);
  },

  /**
   * Marks a workout day as done in the plan's schedule
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan
   * @param date - Date of the workout (YYYY-MM-DD)
   * @throws {Error} If database operation fails
   */
  markWorkoutDayAsDone: async (
    supabase: SupabaseClient,
    userId: string,
    planId: string,
    date: string
  ): Promise<void> => {
    // Fetch the current plan
    const { data: plan, error: fetchError } = await supabase
      .from("plans")
      .select("plan")
      .eq("id", planId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !plan) {
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch plan for marking workout done: ${fetchError?.message}`);
      return; // Don't throw - this is a non-critical operation
    }

    const planData = plan.plan as unknown as {
      schedule: Record<string, { name: string; exercises: unknown[]; done: boolean }>;
    };

    // Check if the date exists in schedule
    if (!planData.schedule || !planData.schedule[date]) {
      // eslint-disable-next-line no-console
      console.warn(`Workout date ${date} not found in plan schedule`);
      return;
    }

    // Update the workout day as done
    planData.schedule[date].done = true;

    // Save the updated plan
    const { error: updateError } = await supabase
      .from("plans")
      .update({ plan: planData as unknown as Json })
      .eq("id", planId)
      .eq("user_id", userId);

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error(`Failed to mark workout as done: ${updateError.message}`);
    }
  },

  /**
   * Checks if a workout day is already marked as done in the plan
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan
   * @param date - Date of the workout (YYYY-MM-DD)
   * @returns true if the workout is already done
   * @throws {Error} If database operation fails
   */
  isWorkoutDayDone: async (
    supabase: SupabaseClient,
    userId: string,
    planId: string,
    date: string
  ): Promise<boolean> => {
    const { data: plan, error } = await supabase
      .from("plans")
      .select("plan")
      .eq("id", planId)
      .eq("user_id", userId)
      .single();

    if (error || !plan) {
      return false;
    }

    const planData = plan.plan as unknown as { schedule: Record<string, { done?: boolean }> };

    return planData.schedule?.[date]?.done === true;
  },

  /**
   * Closes all active sessions for a given plan
   * Used when a plan is archived to clean up any in-progress sessions
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan
   * @returns Number of sessions closed
   * @throws {Error} If database operation fails
   */
  closeSessionsForPlan: async (supabase: SupabaseClient, userId: string, planId: string): Promise<number> => {
    // Find all active sessions for this plan
    const { data: activeSessions, error: fetchError } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .is("ended_at", null);

    if (fetchError) {
      throw new Error(`Failed to fetch active sessions: ${fetchError.message}`);
    }

    if (!activeSessions || activeSessions.length === 0) {
      return 0;
    }

    // Close all active sessions
    const now = new Date().toISOString();
    const sessionIds = activeSessions.map((s) => s.id);

    const { error: updateError } = await supabase
      .from("training_sessions")
      .update({ ended_at: now })
      .in("id", sessionIds);

    if (updateError) {
      throw new Error(`Failed to close sessions: ${updateError.message}`);
    }

    // Log audit events for each closed session
    for (const sessionId of sessionIds) {
      await auditLogService.logEvent(supabase, userId, "session_auto_closed", {
        entityType: "session",
        entityId: sessionId,
        payload: {
          reason: "plan_archived",
          plan_id: planId,
        },
      });
    }

    return activeSessions.length;
  },
};
