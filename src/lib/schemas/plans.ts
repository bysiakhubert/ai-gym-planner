import { z } from "zod";

/**
 * Zod schema for user preferences used in AI plan generation
 */
export const UserPreferencesSchema = z.object({
  goal: z.string().min(1, "Goal is required"),
  system: z.string().min(1, "System is required"),
  available_days: z.array(z.string().min(1)).min(1, "At least one available day is required"),
  session_duration_minutes: z.number().positive("Session duration must be a positive number"),
  cycle_duration_weeks: z.number().positive("Cycle duration must be a positive number"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

/**
 * Zod schema for a single set in a workout plan
 */
export const SetPlanSchema = z.object({
  reps: z.number().int().positive("Reps must be a positive integer"),
  weight: z.number().nonnegative("Weight must be non-negative").optional(),
  rest_seconds: z.number().int().nonnegative("Rest seconds must be a non-negative integer"),
});

/**
 * Zod schema for an exercise with multiple sets
 */
export const ExerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required").max(100, "Exercise name must be 100 characters or less"),
  sets: z.array(SetPlanSchema).min(1, "At least one set is required"),
});

/**
 * Zod schema for a workout day
 */
export const WorkoutDaySchema = z.object({
  name: z.string().min(1, "Workout day name is required").max(100, "Workout day name must be 100 characters or less"),
  exercises: z.array(ExerciseSchema).min(1, "At least one exercise is required"),
  done: z.boolean().default(false),
});

/**
 * Zod schema for the complete plan structure
 */
export const PlanStructureSchema = z.object({
  schedule: z.record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Schedule key must be in YYYY-MM-DD format"),
    WorkoutDaySchema
  ),
});

/**
 * Zod schema for creating a new training plan
 * POST /api/plans
 */
export const CreatePlanRequestSchema = z
  .object({
    name: z.string().min(1, "Plan name is required").max(100, "Plan name must be 100 characters or less"),
    effective_from: z.string().datetime({ message: "effective_from must be a valid ISO 8601 timestamp" }),
    effective_to: z.string().datetime({ message: "effective_to must be a valid ISO 8601 timestamp" }),
    source: z.enum(["ai", "manual"], {
      errorMap: () => ({ message: "Source must be 'ai' or 'manual'" }),
    }),
    prompt: z.string().nullable().optional(),
    preferences: z.union([UserPreferencesSchema, z.record(z.never())]),
    plan: PlanStructureSchema,
  })
  .refine((data) => new Date(data.effective_to) > new Date(data.effective_from), {
    message: "effective_to must be after effective_from",
    path: ["effective_to"],
  });
