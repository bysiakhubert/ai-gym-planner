/**
 * DTO and Command Model Type Definitions for GymPlanner API
 *
 * This file contains all Data Transfer Objects (DTOs) and Command Models
 * used by the REST API. All types are derived from or compatible with
 * the database models defined in src/db/database.types.ts
 */

import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ============================================================================
// Database Entity Types (Re-exported for convenience)
// ============================================================================

export type PlanEntity = Tables<"plans">;
export type PlanInsert = TablesInsert<"plans">;
export type PlanUpdate = TablesUpdate<"plans">;

export type SessionEntity = Tables<"training_sessions">;
export type SessionInsert = TablesInsert<"training_sessions">;
export type SessionUpdate = TablesUpdate<"training_sessions">;

export type AuditEventEntity = Tables<"audit_events">;
export type AuditEventInsert = TablesInsert<"audit_events">;

// ============================================================================
// Plan Structure Types
// ============================================================================

/**
 * Represents a single set in a workout plan
 */
export interface SetPlan {
  reps: number;
  weight?: number;
  rest_seconds: number;
}

/**
 * Represents an exercise with multiple sets in a workout plan
 */
export interface Exercise {
  name: string;
  sets: SetPlan[];
}

/**
 * Represents a single workout day in a training plan
 */
export interface WorkoutDay {
  name: string;
  exercises: Exercise[];
  done: boolean;
}

/**
 * Complete plan structure containing the workout schedule
 * Stored as JSON in plans.plan column
 */
export interface PlanStructure {
  schedule: Record<string, WorkoutDay>; // Key: ISO date string (YYYY-MM-DD)
}

// ============================================================================
// Session Structure Types
// ============================================================================

/**
 * Represents a single set during a training session
 * Includes both planned and actual performance data
 */
export interface SessionSet {
  planned_reps: number;
  planned_weight?: number;
  actual_reps?: number | null;
  actual_weight?: number | null;
  rest_seconds: number;
  completed: boolean;
}

/**
 * Represents an exercise during a training session
 */
export interface SessionExercise {
  name: string;
  sets: SessionSet[];
}

/**
 * Complete session structure containing workout execution data
 * Stored as JSON in training_sessions.session column
 */
export interface SessionStructure {
  plan_name: string;
  day_name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  exercises: SessionExercise[];
}

// ============================================================================
// User Preferences Types
// ============================================================================

/**
 * User preferences for AI workout plan generation
 * Stored as JSON in plans.preferences column
 */
export interface UserPreferences {
  goal: string; // e.g., "hypertrophy", "strength", "endurance"
  system: string; // e.g., "PPL", "FBW", "Upper/Lower"
  available_days: string[]; // e.g., ["monday", "wednesday", "friday"]
  session_duration_minutes: number;
  cycle_duration_weeks: number;
  notes?: string;
}

// ============================================================================
// Plans API - Command Models (Request DTOs)
// ============================================================================

/**
 * Request body for generating an AI workout plan preview
 * POST /api/plans/generate
 */
export interface GeneratePlanRequest {
  preferences: UserPreferences;
}

/**
 * Request body for creating a new training plan
 * POST /api/plans
 *
 * Derived from PlanInsert but with typed JSON fields
 */
export interface CreatePlanRequest {
  name: string;
  effective_from: string; // ISO 8601 timestamp
  effective_to: string; // ISO 8601 timestamp
  source: "ai" | "manual";
  prompt?: string | null;
  preferences: UserPreferences | Record<string, never>; // Empty object for manual plans
  plan: PlanStructure;
}

/**
 * Request body for updating an existing training plan
 * PUT /api/plans/:id
 *
 * Same structure as CreatePlanRequest (full replacement)
 */
export type UpdatePlanRequest = CreatePlanRequest;

/**
 * Request body for generating next training cycle
 * POST /api/plans/:id/generate-next
 */
export interface GenerateNextCycleRequest {
  cycle_duration_weeks: number;
  notes?: string;
}

/**
 * Request body for continuing/duplicating a plan
 * POST /api/plans/:id/continue
 */
export interface ContinuePlanRequest {
  effective_from: string; // ISO date string (YYYY-MM-DD)
  name?: string;
}

// ============================================================================
// Plans API - Response DTOs
// ============================================================================

/**
 * Complete plan response including all fields
 * Used by GET /api/plans/:id, POST /api/plans, PUT /api/plans/:id
 *
 * Derived from PlanEntity with typed JSON fields
 */
export interface PlanResponse {
  id: string;
  user_id: string;
  name: string;
  effective_from: string;
  effective_to: string;
  source: string;
  prompt: string | null;
  preferences: UserPreferences | Record<string, never>;
  plan: PlanStructure;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Summary plan data for list views
 * Used by GET /api/plans (excludes large JSON fields for performance)
 */
export type PlanSummary = Pick<
  PlanResponse,
  "id" | "name" | "effective_from" | "effective_to" | "source" | "created_at" | "updated_at"
>;

/**
 * Response for AI plan generation preview
 * POST /api/plans/generate
 */
export interface GeneratePlanResponse {
  plan: Omit<CreatePlanRequest, "preferences"> & {
    name: string;
    effective_from: string;
    effective_to: string;
    schedule: PlanStructure["schedule"];
  };
  preferences: UserPreferences;
  metadata: {
    model: string;
    generation_time_ms: number;
    fallback_used?: boolean;
  };
}

/**
 * Response for next workout query
 * GET /api/plans/:id/next
 */
export interface NextWorkoutResponse {
  date?: string; // ISO date string (YYYY-MM-DD)
  workout: WorkoutDay | null;
  plan_id: string;
  plan_name: string;
  message?: string; // Present when workout is null
}

/**
 * Response for plan archive operation
 * DELETE /api/plans/:id
 */
export interface ArchivePlanResponse {
  message: string;
  id: string;
}

/**
 * Response for next cycle generation
 * POST /api/plans/:id/generate-next
 */
export interface GenerateNextCycleResponse {
  plan: {
    name: string;
    effective_from: string;
    effective_to: string;
    schedule: PlanStructure["schedule"];
  };
  progression_summary: {
    changes: string[];
  };
  metadata: {
    model: string;
    generation_time_ms: number;
  };
}

// ============================================================================
// Sessions API - Command Models (Request DTOs)
// ============================================================================

/**
 * Request body for creating/starting a new training session
 * POST /api/sessions
 *
 * Derived from SessionInsert with typed JSON fields
 */
export interface CreateSessionRequest {
  plan_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  session: SessionStructure;
}

/**
 * Request body for updating an in-progress training session
 * PATCH /api/sessions/:id
 *
 * Partial update - only session data can be modified
 */
export interface UpdateSessionRequest {
  session: SessionStructure;
}

/**
 * Request body for completing a training session
 * POST /api/sessions/:id/complete
 *
 * Optional final session data update before completion
 */
export interface CompleteSessionRequest {
  session?: SessionStructure;
}

// ============================================================================
// Sessions API - Response DTOs
// ============================================================================

/**
 * Complete session response including all fields
 * Used by GET /api/sessions/:id, POST /api/sessions, PATCH /api/sessions/:id,
 * POST /api/sessions/:id/complete
 *
 * Derived from SessionEntity with typed JSON fields
 */
export interface SessionResponse {
  id: string;
  user_id: string;
  plan_id: string | null;
  session: SessionStructure;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

/**
 * Summary session data for list views
 * Used by GET /api/sessions (excludes full session JSON for performance)
 */
export interface SessionSummary {
  id: string;
  plan_id: string | null;
  plan_name: string;
  day_name: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  completed_sets: number;
  total_sets: number;
}

// ============================================================================
// Audit Events API - Response DTOs
// ============================================================================

/**
 * Audit event response
 * Used by GET /api/audit-events
 *
 * Derived from AuditEventEntity
 */
export interface AuditEventResponse {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Supported audit event types
 */
export type AuditEventType =
  | "ai_generation_requested"
  | "ai_generation_completed"
  | "ai_generation_failed"
  | "plan_created"
  | "plan_accepted"
  | "plan_rejected"
  | "plan_updated"
  | "plan_deleted"
  | "session_started"
  | "session_completed";

// ============================================================================
// Common API Types
// ============================================================================

/**
 * Standard pagination metadata
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Specific paginated response types for different resources
 */
export interface PaginatedPlansResponse {
  plans: PlanSummary[];
  pagination: PaginationMeta;
}

export interface PaginatedSessionsResponse {
  sessions: SessionSummary[];
  pagination: PaginationMeta;
}

export interface PaginatedAuditEventsResponse {
  events: AuditEventResponse[];
  pagination: PaginationMeta;
}

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

/**
 * Common error types
 */
export type ApiErrorType =
  | "ValidationError"
  | "NotFound"
  | "Unauthorized"
  | "Forbidden"
  | "ConflictError"
  | "DateOverlapError"
  | "AIGenerationFailed"
  | "InternalServerError"
  | "ServiceUnavailable";

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for listing plans
 * GET /api/plans
 */
export interface ListPlansQueryParams {
  limit?: number;
  offset?: number;
  sort?: "effective_from" | "created_at" | "name";
  order?: "asc" | "desc";
}

/**
 * Query parameters for listing sessions
 * GET /api/sessions
 */
export interface ListSessionsQueryParams {
  plan_id?: string;
  date_from?: string;
  date_to?: string;
  completed?: boolean;
  limit?: number;
  offset?: number;
  sort?: "started_at" | "created_at";
  order?: "asc" | "desc";
}

/**
 * Query parameters for listing audit events
 * GET /api/audit-events
 */
export interface ListAuditEventsQueryParams {
  event_type?: string;
  entity_type?: "plan" | "session";
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Validation and Business Logic Types
// ============================================================================

/**
 * Training plan source types
 */
export type PlanSource = "ai" | "manual";

/**
 * Session completion status
 */
export type SessionStatus = "in_progress" | "completed";

/**
 * Date range for plan validation
 */
export interface DateRange {
  effective_from: string;
  effective_to: string;
}

/**
 * AI generation metadata
 */
export interface AIGenerationMetadata {
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  generation_time_ms: number;
}

// ============================================================================
// Dashboard API Types
// ============================================================================

/**
 * Single upcoming workout item for dashboard
 * Represents a scheduled workout from an active plan
 */
export interface UpcomingWorkout {
  plan_id: string;
  plan_name: string;
  day_name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  is_next: boolean;
}

/**
 * User state for dashboard UI handling
 * - "new": User has no plans created
 * - "active": User has active plans with upcoming workouts
 * - "completed": User has plans but all workouts are completed
 */
export type DashboardUserState = "new" | "active" | "completed";

/**
 * Response for dashboard summary
 * GET /api/dashboard
 */
export interface DashboardResponse {
  upcoming_workouts: UpcomingWorkout[];
  user_state: DashboardUserState;
}
