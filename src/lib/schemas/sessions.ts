import { z } from "zod";

/**
 * Zod schema for a single set in a training session
 * Includes both planned and actual performance data
 */
export const SessionSetSchema = z.object({
  planned_reps: z.number().int().positive("Planned reps must be a positive integer"),
  planned_weight: z.number().nonnegative("Planned weight must be non-negative").optional(),
  actual_reps: z.number().int().nonnegative("Actual reps must be a non-negative integer").nullable().optional(),
  actual_weight: z.number().nonnegative("Actual weight must be non-negative").nullable().optional(),
  rest_seconds: z.number().int().nonnegative("Rest seconds must be a non-negative integer"),
  completed: z.boolean(),
});

/**
 * Zod schema for an exercise in a training session
 */
export const SessionExerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required").max(100, "Exercise name must be 100 characters or less"),
  sets: z.array(SessionSetSchema).min(1, "At least one set is required"),
});

/**
 * Zod schema for the complete session structure
 * Stored as JSON in training_sessions.session column
 */
export const SessionStructureSchema = z.object({
  plan_name: z.string().min(1, "Plan name is required").max(100, "Plan name must be 100 characters or less"),
  day_name: z.string().min(1, "Day name is required").max(100, "Day name must be 100 characters or less"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  exercises: z.array(SessionExerciseSchema).min(1, "At least one exercise is required"),
});

/**
 * Zod schema for creating a new training session
 * POST /api/sessions
 */
export const CreateSessionRequestSchema = z.object({
  plan_id: z.string().uuid("plan_id must be a valid UUID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  session: SessionStructureSchema,
});

/**
 * Zod schema for updating an in-progress training session
 * PATCH /api/sessions/:id
 */
export const UpdateSessionRequestSchema = z.object({
  session: SessionStructureSchema,
});

/**
 * Zod schema for completing a training session
 * POST /api/sessions/:id/complete
 */
export const CompleteSessionRequestSchema = z.object({
  session: SessionStructureSchema.optional(),
});

/**
 * Zod schema for query parameters when listing sessions
 * GET /api/sessions
 */
export const ListSessionsQueryParamsSchema = z.object({
  plan_id: z.string().uuid("plan_id must be a valid UUID").optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_from must be in YYYY-MM-DD format")
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_to must be in YYYY-MM-DD format")
    .optional(),
  completed: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
  offset: z.coerce.number().int("Offset must be an integer").min(0, "Offset must be non-negative").default(0),
  sort: z.enum(["started_at", "created_at"]).default("started_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Zod schema for validating session ID path parameter
 */
export const SessionIdParamSchema = z.object({
  id: z.string().uuid("Session ID must be a valid UUID"),
});

