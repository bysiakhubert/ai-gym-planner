import { z } from "zod";

export const UserPreferencesSchema = z.object({
  goal: z.string().min(1, "Goal is required"),
  system: z.string().min(1, "System is required"),
  available_days: z.array(z.string().min(1)).min(1, "At least one available day is required"),
  session_duration_minutes: z.number().positive("Session duration must be a positive number"),
  cycle_duration_weeks: z.number().positive("Cycle duration must be a positive number"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});
