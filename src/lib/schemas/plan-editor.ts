import { z } from "zod";

/**
 * Zod schema for a single set in the plan editor form
 */
export const SetFormSchema = z.object({
  reps: z.coerce
    .number({ invalid_type_error: "Powtórzenia muszą być liczbą" })
    .int("Powtórzenia muszą być liczbą całkowitą")
    .positive("Powtórzenia muszą być większe od 0"),
  weight: z.coerce
    .number({ invalid_type_error: "Ciężar musi być liczbą" })
    .nonnegative("Ciężar nie może być ujemny")
    .nullable()
    .optional(),
  rest_seconds: z.coerce
    .number({ invalid_type_error: "Przerwa musi być liczbą" })
    .int("Przerwa musi być liczbą całkowitą")
    .nonnegative("Przerwa nie może być ujemna"),
});

/**
 * Zod schema for an exercise in the plan editor form
 */
export const ExerciseFormSchema = z.object({
  name: z.string().min(1, "Nazwa ćwiczenia jest wymagana").max(100, "Nazwa ćwiczenia może mieć maksymalnie 100 znaków"),
  sets: z.array(SetFormSchema).min(1, "Ćwiczenie musi mieć co najmniej jedną serię"),
});

/**
 * Zod schema for a training day in the plan editor form
 */
export const DayFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD"),
  name: z.string().min(1, "Nazwa dnia jest wymagana").max(100, "Nazwa dnia może mieć maksymalnie 100 znaków"),
  exercises: z.array(ExerciseFormSchema).min(1, "Dzień treningowy musi mieć co najmniej jedno ćwiczenie"),
});

/**
 * Main Zod schema for the plan editor form
 * This schema uses an array-based structure for days, which is easier to work with in forms
 */
export const PlanEditorFormSchema = z
  .object({
    name: z.string().min(1, "Nazwa planu jest wymagana").max(100, "Nazwa planu może mieć maksymalnie 100 znaków"),
    effective_from: z.string().min(1, "Data rozpoczęcia jest wymagana"),
    effective_to: z.string().min(1, "Data zakończenia jest wymagana"),
    days: z.array(DayFormSchema).min(1, "Plan musi zawierać co najmniej jeden dzień treningowy"),
  })
  .refine(
    (data) => {
      const from = new Date(data.effective_from);
      const to = new Date(data.effective_to);
      return to >= from;
    },
    {
      message: "Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia",
      path: ["effective_to"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate dates in days array
      const dates = data.days.map((day) => day.date);
      const uniqueDates = new Set(dates);
      return dates.length === uniqueDates.size;
    },
    {
      message: "Daty dni treningowych muszą być unikalne",
      path: ["days"],
    }
  );

/**
 * Type inferred from the plan editor form schema
 */
export type PlanEditorFormValues = z.infer<typeof PlanEditorFormSchema>;

/**
 * Type for a single set in the form
 */
export type SetFormValues = z.infer<typeof SetFormSchema>;

/**
 * Type for an exercise in the form
 */
export type ExerciseFormValues = z.infer<typeof ExerciseFormSchema>;

/**
 * Type for a training day in the form
 */
export type DayFormValues = z.infer<typeof DayFormSchema>;

/**
 * Default values for a new set
 */
export const defaultSetValues: SetFormValues = {
  reps: 10,
  weight: null,
  rest_seconds: 90,
};

/**
 * Default values for a new exercise
 */
export const defaultExerciseValues: ExerciseFormValues = {
  name: "",
  sets: [{ ...defaultSetValues }],
};

/**
 * Creates default values for a new day with the given date
 * @param date - ISO date string (YYYY-MM-DD)
 */
export function createDefaultDayValues(date: string): DayFormValues {
  return {
    date,
    name: "",
    exercises: [{ ...defaultExerciseValues, sets: [{ ...defaultSetValues }] }],
  };
}

/**
 * Generates the next date based on the last day in the array
 * @param days - Array of existing days
 * @returns Next date as ISO string (YYYY-MM-DD)
 */
export function getNextDayDate(days: DayFormValues[]): string {
  if (days.length === 0) {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  const lastDate = days[days.length - 1].date;
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + 1);
  return nextDate.toISOString().split("T")[0];
}
