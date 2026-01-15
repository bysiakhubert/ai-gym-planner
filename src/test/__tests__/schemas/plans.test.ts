import { describe, it, expect } from "vitest";
import {
  UserPreferencesSchema,
  SetPlanSchema,
  ExerciseSchema,
  WorkoutDaySchema,
  PlanStructureSchema,
  CreatePlanRequestSchema,
  ListPlansQueryParamsSchema,
  ContinuePlanRequestSchema,
} from "@/lib/schemas/plans";

describe("UserPreferencesSchema", () => {
  it("should validate correct user preferences", () => {
    const validData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: ["monday", "wednesday", "friday"],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
    };

    expect(() => UserPreferencesSchema.parse(validData)).not.toThrow();
    const result = UserPreferencesSchema.parse(validData);
    expect(result).toEqual(validData);
  });

  it("should validate preferences with optional notes", () => {
    const validData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: ["monday"],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
      notes: "Mam kontuzję kolana",
    };

    const result = UserPreferencesSchema.parse(validData);
    expect(result.notes).toBe("Mam kontuzję kolana");
  });

  it("should reject empty goal", () => {
    const invalidData = {
      goal: "",
      system: "PPL",
      available_days: ["monday"],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
    };

    expect(() => UserPreferencesSchema.parse(invalidData)).toThrow("Cel treningowy jest wymagany");
  });

  it("should reject empty system", () => {
    const invalidData = {
      goal: "hipertrofia",
      system: "",
      available_days: ["monday"],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
    };

    expect(() => UserPreferencesSchema.parse(invalidData)).toThrow("System treningowy jest wymagany");
  });

  it("should reject empty available_days array", () => {
    const invalidData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: [],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
    };

    expect(() => UserPreferencesSchema.parse(invalidData)).toThrow("Musisz wybrać przynajmniej jeden dzień treningowy");
  });

  it("should reject negative session_duration_minutes", () => {
    const invalidData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: ["monday"],
      session_duration_minutes: -10,
      cycle_duration_weeks: 4,
    };

    expect(() => UserPreferencesSchema.parse(invalidData)).toThrow("Czas trwania sesji musi być liczbą dodatnią");
  });

  it("should reject zero session_duration_minutes", () => {
    const invalidData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: ["monday"],
      session_duration_minutes: 0,
      cycle_duration_weeks: 4,
    };

    expect(() => UserPreferencesSchema.parse(invalidData)).toThrow();
  });

  it("should reject negative cycle_duration_weeks", () => {
    const invalidData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: ["monday"],
      session_duration_minutes: 60,
      cycle_duration_weeks: -2,
    };

    expect(() => UserPreferencesSchema.parse(invalidData)).toThrow("Długość cyklu musi być liczbą dodatnią");
  });

  it("should reject notes exceeding 2000 characters", () => {
    const invalidData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: ["monday"],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
      notes: "a".repeat(2001),
    };

    expect(() => UserPreferencesSchema.parse(invalidData)).toThrow("Dodatkowe uwagi nie mogą przekraczać 2000 znaków");
  });

  it("should accept notes at exactly 2000 characters", () => {
    const validData = {
      goal: "hipertrofia",
      system: "PPL",
      available_days: ["monday"],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
      notes: "a".repeat(2000),
    };

    expect(() => UserPreferencesSchema.parse(validData)).not.toThrow();
  });
});

describe("SetPlanSchema", () => {
  it("should validate correct set plan", () => {
    const validData = {
      reps: 10,
      weight: 80,
      rest_seconds: 90,
    };

    expect(() => SetPlanSchema.parse(validData)).not.toThrow();
  });

  it("should validate set without weight (bodyweight)", () => {
    const validData = {
      reps: 10,
      rest_seconds: 90,
    };

    expect(() => SetPlanSchema.parse(validData)).not.toThrow();
  });

  it("should accept zero weight", () => {
    const validData = {
      reps: 10,
      weight: 0,
      rest_seconds: 90,
    };

    expect(() => SetPlanSchema.parse(validData)).not.toThrow();
  });

  it("should reject negative reps", () => {
    const invalidData = {
      reps: -5,
      weight: 80,
      rest_seconds: 90,
    };

    expect(() => SetPlanSchema.parse(invalidData)).toThrow("Reps must be a positive integer");
  });

  it("should reject zero reps", () => {
    const invalidData = {
      reps: 0,
      weight: 80,
      rest_seconds: 90,
    };

    expect(() => SetPlanSchema.parse(invalidData)).toThrow();
  });

  it("should reject decimal reps", () => {
    const invalidData = {
      reps: 10.5,
      weight: 80,
      rest_seconds: 90,
    };

    expect(() => SetPlanSchema.parse(invalidData)).toThrow();
  });

  it("should reject negative weight", () => {
    const invalidData = {
      reps: 10,
      weight: -10,
      rest_seconds: 90,
    };

    expect(() => SetPlanSchema.parse(invalidData)).toThrow("Weight must be non-negative");
  });

  it("should reject negative rest_seconds", () => {
    const invalidData = {
      reps: 10,
      weight: 80,
      rest_seconds: -30,
    };

    expect(() => SetPlanSchema.parse(invalidData)).toThrow("Rest seconds must be a non-negative integer");
  });

  it("should accept zero rest_seconds", () => {
    const validData = {
      reps: 10,
      weight: 80,
      rest_seconds: 0,
    };

    expect(() => SetPlanSchema.parse(validData)).not.toThrow();
  });
});

describe("ExerciseSchema", () => {
  it("should validate correct exercise", () => {
    const validData = {
      name: "Bench Press",
      sets: [
        { reps: 10, weight: 80, rest_seconds: 90 },
        { reps: 10, weight: 80, rest_seconds: 90 },
      ],
    };

    expect(() => ExerciseSchema.parse(validData)).not.toThrow();
  });

  it("should reject empty exercise name", () => {
    const invalidData = {
      name: "",
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => ExerciseSchema.parse(invalidData)).toThrow("Exercise name is required");
  });

  it("should reject exercise name exceeding 100 characters", () => {
    const invalidData = {
      name: "a".repeat(101),
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => ExerciseSchema.parse(invalidData)).toThrow("Exercise name must be 100 characters or less");
  });

  it("should accept exercise name at exactly 100 characters", () => {
    const validData = {
      name: "a".repeat(100),
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => ExerciseSchema.parse(validData)).not.toThrow();
  });

  it("should reject exercise with empty sets array", () => {
    const invalidData = {
      name: "Bench Press",
      sets: [],
    };

    expect(() => ExerciseSchema.parse(invalidData)).toThrow("At least one set is required");
  });
});

describe("WorkoutDaySchema", () => {
  it("should validate correct workout day", () => {
    const validData = {
      name: "Push Day",
      exercises: [
        {
          name: "Bench Press",
          sets: [{ reps: 10, weight: 80, rest_seconds: 90 }],
        },
      ],
      done: false,
    };

    expect(() => WorkoutDaySchema.parse(validData)).not.toThrow();
  });

  it("should default done to false when not provided", () => {
    const validData = {
      name: "Push Day",
      exercises: [
        {
          name: "Bench Press",
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    const result = WorkoutDaySchema.parse(validData);
    expect(result.done).toBe(false);
  });

  it("should accept done as true", () => {
    const validData = {
      name: "Push Day",
      exercises: [
        {
          name: "Bench Press",
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
      done: true,
    };

    const result = WorkoutDaySchema.parse(validData);
    expect(result.done).toBe(true);
  });

  it("should reject empty workout day name", () => {
    const invalidData = {
      name: "",
      exercises: [
        {
          name: "Bench Press",
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => WorkoutDaySchema.parse(invalidData)).toThrow("Workout day name is required");
  });

  it("should reject workout day name exceeding 100 characters", () => {
    const invalidData = {
      name: "a".repeat(101),
      exercises: [
        {
          name: "Bench Press",
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => WorkoutDaySchema.parse(invalidData)).toThrow("Workout day name must be 100 characters or less");
  });

  it("should reject empty exercises array", () => {
    const invalidData = {
      name: "Push Day",
      exercises: [],
    };

    expect(() => WorkoutDaySchema.parse(invalidData)).toThrow("At least one exercise is required");
  });
});

describe("PlanStructureSchema", () => {
  it("should validate correct plan structure", () => {
    const validData = {
      schedule: {
        "2025-12-30": {
          name: "Push Day",
          exercises: [
            {
              name: "Bench Press",
              sets: [{ reps: 10, weight: 80, rest_seconds: 90 }],
            },
          ],
          done: false,
        },
      },
    };

    expect(() => PlanStructureSchema.parse(validData)).not.toThrow();
  });

  it("should reject schedule with invalid date format", () => {
    const invalidData = {
      schedule: {
        "2025/12/30": {
          name: "Push Day",
          exercises: [
            {
              name: "Bench Press",
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      },
    };

    expect(() => PlanStructureSchema.parse(invalidData)).toThrow("Schedule key must be in YYYY-MM-DD format");
  });

  it("should accept empty schedule object", () => {
    const validData = {
      schedule: {},
    };

    expect(() => PlanStructureSchema.parse(validData)).not.toThrow();
  });
});

describe("CreatePlanRequestSchema", () => {
  it("should validate correct create plan request", () => {
    const validData = {
      name: "Test Plan",
      effective_from: "2025-12-30T00:00:00.000Z",
      effective_to: "2026-01-27T00:00:00.000Z",
      source: "ai" as const,
      prompt: null,
      preferences: {
        goal: "hipertrofia",
        system: "PPL",
        available_days: ["monday"],
        session_duration_minutes: 60,
        cycle_duration_weeks: 4,
      },
      plan: {
        schedule: {
          "2025-12-30": {
            name: "Push Day",
            exercises: [
              {
                name: "Bench Press",
                sets: [{ reps: 10, rest_seconds: 90 }],
              },
            ],
          },
        },
      },
    };

    expect(() => CreatePlanRequestSchema.parse(validData)).not.toThrow();
  });

  it("should validate manual plan with empty preferences", () => {
    const validData = {
      name: "Manual Plan",
      effective_from: "2025-12-30T00:00:00.000Z",
      effective_to: "2026-01-27T00:00:00.000Z",
      source: "manual" as const,
      preferences: {},
      plan: {
        schedule: {
          "2025-12-30": {
            name: "Push Day",
            exercises: [
              {
                name: "Bench Press",
                sets: [{ reps: 10, rest_seconds: 90 }],
              },
            ],
          },
        },
      },
    };

    expect(() => CreatePlanRequestSchema.parse(validData)).not.toThrow();
  });

  it("should reject when effective_to is before effective_from", () => {
    const invalidData = {
      name: "Test Plan",
      effective_from: "2026-01-27T00:00:00.000Z",
      effective_to: "2025-12-30T00:00:00.000Z",
      source: "ai" as const,
      preferences: {
        goal: "hipertrofia",
        system: "PPL",
        available_days: ["monday"],
        session_duration_minutes: 60,
        cycle_duration_weeks: 4,
      },
      plan: {
        schedule: {},
      },
    };

    expect(() => CreatePlanRequestSchema.parse(invalidData)).toThrow("effective_to must be after effective_from");
  });

  it("should accept when effective_to equals effective_from", () => {
    const validData = {
      name: "Test Plan",
      effective_from: "2025-12-30T00:00:00.000Z",
      effective_to: "2025-12-30T23:59:59.999Z", // Same day but later time
      source: "ai" as const,
      preferences: {},
      plan: {
        schedule: {},
      },
    };

    expect(() => CreatePlanRequestSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid source value", () => {
    const invalidData = {
      name: "Test Plan",
      effective_from: "2025-12-30T00:00:00.000Z",
      effective_to: "2026-01-27T00:00:00.000Z",
      source: "invalid",
      preferences: {},
      plan: {
        schedule: {},
      },
    };

    expect(() => CreatePlanRequestSchema.parse(invalidData)).toThrow("Source must be 'ai' or 'manual'");
  });

  it("should reject empty plan name", () => {
    const invalidData = {
      name: "",
      effective_from: "2025-12-30T00:00:00.000Z",
      effective_to: "2026-01-27T00:00:00.000Z",
      source: "ai" as const,
      preferences: {},
      plan: {
        schedule: {},
      },
    };

    expect(() => CreatePlanRequestSchema.parse(invalidData)).toThrow("Plan name is required");
  });

  it("should reject plan name exceeding 100 characters", () => {
    const invalidData = {
      name: "a".repeat(101),
      effective_from: "2025-12-30T00:00:00.000Z",
      effective_to: "2026-01-27T00:00:00.000Z",
      source: "ai" as const,
      preferences: {},
      plan: {
        schedule: {},
      },
    };

    expect(() => CreatePlanRequestSchema.parse(invalidData)).toThrow("Plan name must be 100 characters or less");
  });
});

describe("ListPlansQueryParamsSchema", () => {
  it("should validate with default values", () => {
    const result = ListPlansQueryParamsSchema.parse({});
    expect(result).toEqual({
      limit: 20,
      offset: 0,
      sort: "effective_from",
      order: "desc",
    });
  });

  it("should validate with custom values", () => {
    const validData = {
      limit: 50,
      offset: 10,
      sort: "created_at",
      order: "asc",
    };

    const result = ListPlansQueryParamsSchema.parse(validData);
    expect(result).toEqual(validData);
  });

  it("should coerce string limit to number", () => {
    const result = ListPlansQueryParamsSchema.parse({ limit: "30" });
    expect(result.limit).toBe(30);
    expect(typeof result.limit).toBe("number");
  });

  it("should reject limit below 1", () => {
    expect(() => ListPlansQueryParamsSchema.parse({ limit: 0 })).toThrow("Limit must be at least 1");
  });

  it("should reject limit above 100", () => {
    expect(() => ListPlansQueryParamsSchema.parse({ limit: 101 })).toThrow("Limit cannot exceed 100");
  });

  it("should reject negative offset", () => {
    expect(() => ListPlansQueryParamsSchema.parse({ offset: -1 })).toThrow("Offset must be non-negative");
  });

  it("should reject invalid sort value", () => {
    expect(() => ListPlansQueryParamsSchema.parse({ sort: "invalid" })).toThrow();
  });

  it("should reject invalid order value", () => {
    expect(() => ListPlansQueryParamsSchema.parse({ order: "invalid" })).toThrow();
  });
});

describe("ContinuePlanRequestSchema", () => {
  it("should validate correct continue plan request", () => {
    const validData = {
      effective_from: "2026-01-28",
      name: "Continued Plan",
    };

    expect(() => ContinuePlanRequestSchema.parse(validData)).not.toThrow();
  });

  it("should validate without optional name", () => {
    const validData = {
      effective_from: "2026-01-28",
    };

    expect(() => ContinuePlanRequestSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid date format", () => {
    const invalidData = {
      effective_from: "2026/01/28",
    };

    expect(() => ContinuePlanRequestSchema.parse(invalidData)).toThrow("effective_from must be in YYYY-MM-DD format");
  });

  it("should reject datetime string for effective_from", () => {
    const invalidData = {
      effective_from: "2026-01-28T00:00:00.000Z",
    };

    expect(() => ContinuePlanRequestSchema.parse(invalidData)).toThrow();
  });

  it("should reject empty name", () => {
    const invalidData = {
      effective_from: "2026-01-28",
      name: "",
    };

    expect(() => ContinuePlanRequestSchema.parse(invalidData)).toThrow("Plan name cannot be empty");
  });

  it("should reject name exceeding 100 characters", () => {
    const invalidData = {
      effective_from: "2026-01-28",
      name: "a".repeat(101),
    };

    expect(() => ContinuePlanRequestSchema.parse(invalidData)).toThrow("Plan name must be 100 characters or less");
  });
});
