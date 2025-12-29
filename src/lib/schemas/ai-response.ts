import { z } from "zod";

/**
 * Schema for a single set in AI-generated workout plan
 * Defines reps, optional weight, rest time, and intensity (RIR)
 */
export const aiSetSchema = z.object({
  reps: z.number().int().positive().describe("Number of repetitions"),
  weight: z.number().nonnegative().optional().describe("Suggested weight in kg (optional)"),
  rest_seconds: z.number().int().nonnegative().describe("Rest time between sets in seconds"),
  rir: z.number().int().min(0).max(5).optional().describe("Reps In Reserve - suggested intensity level (0-5)"),
});

/**
 * Schema for an exercise with multiple sets
 * Contains exercise name, array of sets, and optional technical notes
 */
export const aiExerciseSchema = z.object({
  name: z.string().min(1).max(100).describe("Exact exercise name"),
  sets: z.array(aiSetSchema).min(1).describe("List of sets for this exercise"),
  notes: z.string().max(500).optional().describe("Technical tips and form cues"),
});

/**
 * Schema for a single workout day
 * Contains workout name and list of exercises
 */
export const aiWorkoutDaySchema = z.object({
  name: z.string().min(1).max(100).describe("Workout name, e.g. 'Push A', 'Upper Body'"),
  exercises: z.array(aiExerciseSchema).min(1).describe("List of exercises for this workout day"),
});

/**
 * Schema for complete training plan from AI
 * Contains plan metadata and workout schedule
 */
export const aiPlanSchema = z.object({
  name: z.string().min(1).max(100).describe("Name of the complete training plan"),
  description: z.string().min(1).max(500).describe("Brief description of plan strategy and goals"),
  schedule: z.array(aiWorkoutDaySchema).min(1).describe("List of workout days in the training cycle"),
  cycle_duration_weeks: z.number().int().positive().describe("Duration of the training cycle in weeks"),
});

/**
 * TypeScript type inferred from AI plan schema
 */
export type AiPlanResponse = z.infer<typeof aiPlanSchema>;

/**
 * TypeScript types for individual components
 */
export type AiSet = z.infer<typeof aiSetSchema>;
export type AiExercise = z.infer<typeof aiExerciseSchema>;
export type AiWorkoutDay = z.infer<typeof aiWorkoutDaySchema>;
