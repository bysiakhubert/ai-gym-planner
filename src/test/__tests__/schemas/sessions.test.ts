import { describe, it, expect } from "vitest";
import {
  SessionSetSchema,
  SessionExerciseSchema,
  SessionStructureSchema,
  CreateSessionRequestSchema,
  UpdateSessionRequestSchema,
  CompleteSessionRequestSchema,
  ListSessionsQueryParamsSchema,
  SessionIdParamSchema,
} from "@/lib/schemas/sessions";

describe("SessionSetSchema", () => {
  it("should validate correct session set", () => {
    const validData = {
      planned_reps: 10,
      planned_weight: 80,
      actual_reps: 10,
      actual_weight: 80,
      rest_seconds: 90,
      completed: true,
    };

    expect(() => SessionSetSchema.parse(validData)).not.toThrow();
  });

  it("should validate set without actual values (not completed)", () => {
    const validData = {
      planned_reps: 10,
      planned_weight: 80,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(validData)).not.toThrow();
  });

  it("should accept null actual values", () => {
    const validData = {
      planned_reps: 10,
      actual_reps: null,
      actual_weight: null,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(validData)).not.toThrow();
  });

  it("should accept bodyweight exercise (no planned_weight)", () => {
    const validData = {
      planned_reps: 10,
      actual_reps: 10,
      rest_seconds: 90,
      completed: true,
    };

    expect(() => SessionSetSchema.parse(validData)).not.toThrow();
  });

  it("should accept zero actual_reps (failed set)", () => {
    const validData = {
      planned_reps: 10,
      actual_reps: 0,
      rest_seconds: 90,
      completed: true,
    };

    expect(() => SessionSetSchema.parse(validData)).not.toThrow();
  });

  it("should reject negative planned_reps", () => {
    const invalidData = {
      planned_reps: -5,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(invalidData)).toThrow("Planned reps must be a positive integer");
  });

  it("should reject zero planned_reps", () => {
    const invalidData = {
      planned_reps: 0,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(invalidData)).toThrow();
  });

  it("should reject decimal planned_reps", () => {
    const invalidData = {
      planned_reps: 10.5,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(invalidData)).toThrow();
  });

  it("should reject negative actual_reps", () => {
    const invalidData = {
      planned_reps: 10,
      actual_reps: -5,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(invalidData)).toThrow("Actual reps must be a non-negative integer");
  });

  it("should reject negative planned_weight", () => {
    const invalidData = {
      planned_reps: 10,
      planned_weight: -10,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(invalidData)).toThrow("Planned weight must be non-negative");
  });

  it("should reject negative actual_weight", () => {
    const invalidData = {
      planned_reps: 10,
      actual_weight: -10,
      rest_seconds: 90,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(invalidData)).toThrow("Actual weight must be non-negative");
  });

  it("should reject negative rest_seconds", () => {
    const invalidData = {
      planned_reps: 10,
      rest_seconds: -30,
      completed: false,
    };

    expect(() => SessionSetSchema.parse(invalidData)).toThrow("Rest seconds must be a non-negative integer");
  });
});

describe("SessionExerciseSchema", () => {
  it("should validate correct session exercise", () => {
    const validData = {
      name: "Bench Press",
      sets: [
        {
          planned_reps: 10,
          planned_weight: 80,
          actual_reps: 10,
          actual_weight: 80,
          rest_seconds: 90,
          completed: true,
        },
      ],
    };

    expect(() => SessionExerciseSchema.parse(validData)).not.toThrow();
  });

  it("should reject empty exercise name", () => {
    const invalidData = {
      name: "",
      sets: [
        {
          planned_reps: 10,
          rest_seconds: 90,
          completed: false,
        },
      ],
    };

    expect(() => SessionExerciseSchema.parse(invalidData)).toThrow("Exercise name is required");
  });

  it("should reject exercise name exceeding 100 characters", () => {
    const invalidData = {
      name: "a".repeat(101),
      sets: [
        {
          planned_reps: 10,
          rest_seconds: 90,
          completed: false,
        },
      ],
    };

    expect(() => SessionExerciseSchema.parse(invalidData)).toThrow("Exercise name must be 100 characters or less");
  });

  it("should reject empty sets array", () => {
    const invalidData = {
      name: "Bench Press",
      sets: [],
    };

    expect(() => SessionExerciseSchema.parse(invalidData)).toThrow("At least one set is required");
  });
});

describe("SessionStructureSchema", () => {
  it("should validate correct session structure", () => {
    const validData = {
      plan_name: "Test Plan",
      day_name: "Push Day",
      date: "2025-12-30",
      exercises: [
        {
          name: "Bench Press",
          sets: [
            {
              planned_reps: 10,
              planned_weight: 80,
              rest_seconds: 90,
              completed: false,
            },
          ],
        },
      ],
    };

    expect(() => SessionStructureSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid date format", () => {
    const invalidData = {
      plan_name: "Test Plan",
      day_name: "Push Day",
      date: "2025/12/30",
      exercises: [
        {
          name: "Bench Press",
          sets: [
            {
              planned_reps: 10,
              rest_seconds: 90,
              completed: false,
            },
          ],
        },
      ],
    };

    expect(() => SessionStructureSchema.parse(invalidData)).toThrow("Date must be in YYYY-MM-DD format");
  });

  it("should reject datetime string", () => {
    const invalidData = {
      plan_name: "Test Plan",
      day_name: "Push Day",
      date: "2025-12-30T00:00:00.000Z",
      exercises: [
        {
          name: "Bench Press",
          sets: [
            {
              planned_reps: 10,
              rest_seconds: 90,
              completed: false,
            },
          ],
        },
      ],
    };

    expect(() => SessionStructureSchema.parse(invalidData)).toThrow();
  });

  it("should reject empty exercises array", () => {
    const invalidData = {
      plan_name: "Test Plan",
      day_name: "Push Day",
      date: "2025-12-30",
      exercises: [],
    };

    expect(() => SessionStructureSchema.parse(invalidData)).toThrow("At least one exercise is required");
  });
});

describe("CreateSessionRequestSchema", () => {
  it("should validate correct create session request", () => {
    const validData = {
      plan_id: "550e8400-e29b-41d4-a716-446655440000",
      date: "2025-12-30",
      session: {
        plan_name: "Test Plan",
        day_name: "Push Day",
        date: "2025-12-30",
        exercises: [
          {
            name: "Bench Press",
            sets: [
              {
                planned_reps: 10,
                rest_seconds: 90,
                completed: false,
              },
            ],
          },
        ],
      },
    };

    expect(() => CreateSessionRequestSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid UUID format", () => {
    const invalidData = {
      plan_id: "invalid-uuid",
      date: "2025-12-30",
      session: {
        plan_name: "Test Plan",
        day_name: "Push Day",
        date: "2025-12-30",
        exercises: [
          {
            name: "Bench Press",
            sets: [
              {
                planned_reps: 10,
                rest_seconds: 90,
                completed: false,
              },
            ],
          },
        ],
      },
    };

    expect(() => CreateSessionRequestSchema.parse(invalidData)).toThrow("plan_id must be a valid UUID");
  });

  it("should reject invalid date format", () => {
    const invalidData = {
      plan_id: "550e8400-e29b-41d4-a716-446655440000",
      date: "2025/12/30",
      session: {
        plan_name: "Test Plan",
        day_name: "Push Day",
        date: "2025-12-30",
        exercises: [
          {
            name: "Bench Press",
            sets: [
              {
                planned_reps: 10,
                rest_seconds: 90,
                completed: false,
              },
            ],
          },
        ],
      },
    };

    expect(() => CreateSessionRequestSchema.parse(invalidData)).toThrow("Date must be in YYYY-MM-DD format");
  });
});

describe("UpdateSessionRequestSchema", () => {
  it("should validate correct update session request", () => {
    const validData = {
      session: {
        plan_name: "Test Plan",
        day_name: "Push Day",
        date: "2025-12-30",
        exercises: [
          {
            name: "Bench Press",
            sets: [
              {
                planned_reps: 10,
                actual_reps: 10,
                rest_seconds: 90,
                completed: true,
              },
            ],
          },
        ],
      },
    };

    expect(() => UpdateSessionRequestSchema.parse(validData)).not.toThrow();
  });
});

describe("CompleteSessionRequestSchema", () => {
  it("should validate complete session with session data", () => {
    const validData = {
      session: {
        plan_name: "Test Plan",
        day_name: "Push Day",
        date: "2025-12-30",
        exercises: [
          {
            name: "Bench Press",
            sets: [
              {
                planned_reps: 10,
                actual_reps: 10,
                rest_seconds: 90,
                completed: true,
              },
            ],
          },
        ],
      },
    };

    expect(() => CompleteSessionRequestSchema.parse(validData)).not.toThrow();
  });

  it("should validate complete session without session data", () => {
    const validData = {};

    expect(() => CompleteSessionRequestSchema.parse(validData)).not.toThrow();
  });

  it("should accept undefined session", () => {
    const validData = {
      session: undefined,
    };

    expect(() => CompleteSessionRequestSchema.parse(validData)).not.toThrow();
  });
});

describe("ListSessionsQueryParamsSchema", () => {
  it("should validate with default values", () => {
    const result = ListSessionsQueryParamsSchema.parse({});

    expect(result).toEqual({
      limit: 20,
      offset: 0,
      sort: "started_at",
      order: "desc",
    });
  });

  it("should validate with all optional parameters", () => {
    const validData = {
      plan_id: "550e8400-e29b-41d4-a716-446655440000",
      date_from: "2025-12-01",
      date_to: "2025-12-31",
      completed: "true",
      limit: 50,
      offset: 10,
      sort: "created_at",
      order: "asc",
    };

    const result = ListSessionsQueryParamsSchema.parse(validData);
    expect(result.plan_id).toBe(validData.plan_id);
    expect(result.date_from).toBe(validData.date_from);
    expect(result.date_to).toBe(validData.date_to);
    expect(result.completed).toBe(true);
  });

  it("should transform completed string to boolean", () => {
    const result = ListSessionsQueryParamsSchema.parse({ completed: "true" });
    expect(result.completed).toBe(true);
    expect(typeof result.completed).toBe("boolean");
  });

  it("should transform false string to boolean", () => {
    const result = ListSessionsQueryParamsSchema.parse({ completed: "false" });
    expect(result.completed).toBe(false);
  });

  it("should coerce string limit to number", () => {
    const result = ListSessionsQueryParamsSchema.parse({ limit: "30" });
    expect(result.limit).toBe(30);
    expect(typeof result.limit).toBe("number");
  });

  it("should reject invalid plan_id UUID", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        plan_id: "invalid-uuid",
      })
    ).toThrow("plan_id must be a valid UUID");
  });

  it("should reject invalid date_from format", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        date_from: "2025/12/01",
      })
    ).toThrow("date_from must be in YYYY-MM-DD format");
  });

  it("should reject invalid date_to format", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        date_to: "2025/12/31",
      })
    ).toThrow("date_to must be in YYYY-MM-DD format");
  });

  it("should reject limit below 1", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        limit: 0,
      })
    ).toThrow("Limit must be at least 1");
  });

  it("should reject limit above 100", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        limit: 101,
      })
    ).toThrow("Limit cannot exceed 100");
  });

  it("should reject negative offset", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        offset: -1,
      })
    ).toThrow("Offset must be non-negative");
  });

  it("should reject invalid sort value", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        sort: "invalid",
      })
    ).toThrow();
  });

  it("should reject invalid order value", () => {
    expect(() =>
      ListSessionsQueryParamsSchema.parse({
        order: "invalid",
      })
    ).toThrow();
  });
});

describe("SessionIdParamSchema", () => {
  it("should validate correct UUID", () => {
    const validData = {
      id: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(() => SessionIdParamSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid UUID format", () => {
    const invalidData = {
      id: "invalid-uuid",
    };

    expect(() => SessionIdParamSchema.parse(invalidData)).toThrow("Session ID must be a valid UUID");
  });

  it("should reject empty string", () => {
    const invalidData = {
      id: "",
    };

    expect(() => SessionIdParamSchema.parse(invalidData)).toThrow();
  });

  it("should reject UUID with wrong format", () => {
    const invalidData = {
      id: "550e8400-e29b-41d4-a716",
    };

    expect(() => SessionIdParamSchema.parse(invalidData)).toThrow();
  });
});
