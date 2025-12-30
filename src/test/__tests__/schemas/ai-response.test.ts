import { describe, it, expect } from 'vitest';
import {
  aiSetSchema,
  aiExerciseSchema,
  aiWorkoutDaySchema,
  aiPlanSchema,
  aiNextCycleSchema,
} from '@/lib/schemas/ai-response';

describe('aiSetSchema', () => {
  it('should validate correct set with all fields', () => {
    const validData = {
      reps: 10,
      weight: 80,
      rest_seconds: 90,
      rir: 2,
    };

    expect(() => aiSetSchema.parse(validData)).not.toThrow();
  });

  it('should validate set without optional weight', () => {
    const validData = {
      reps: 10,
      rest_seconds: 90,
      rir: 2,
    };

    expect(() => aiSetSchema.parse(validData)).not.toThrow();
  });

  it('should validate set without optional rir', () => {
    const validData = {
      reps: 10,
      weight: 80,
      rest_seconds: 90,
    };

    expect(() => aiSetSchema.parse(validData)).not.toThrow();
  });

  it('should accept zero weight', () => {
    const validData = {
      reps: 10,
      weight: 0,
      rest_seconds: 90,
    };

    expect(() => aiSetSchema.parse(validData)).not.toThrow();
  });

  it('should accept rir at minimum (0)', () => {
    const validData = {
      reps: 10,
      rest_seconds: 90,
      rir: 0,
    };

    expect(() => aiSetSchema.parse(validData)).not.toThrow();
  });

  it('should accept rir at maximum (5)', () => {
    const validData = {
      reps: 10,
      rest_seconds: 90,
      rir: 5,
    };

    expect(() => aiSetSchema.parse(validData)).not.toThrow();
  });

  it('should reject negative reps', () => {
    const invalidData = {
      reps: -5,
      rest_seconds: 90,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });

  it('should reject zero reps', () => {
    const invalidData = {
      reps: 0,
      rest_seconds: 90,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });

  it('should reject decimal reps', () => {
    const invalidData = {
      reps: 10.5,
      rest_seconds: 90,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });

  it('should reject negative weight', () => {
    const invalidData = {
      reps: 10,
      weight: -10,
      rest_seconds: 90,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });

  it('should reject negative rest_seconds', () => {
    const invalidData = {
      reps: 10,
      rest_seconds: -30,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });

  it('should reject rir below 0', () => {
    const invalidData = {
      reps: 10,
      rest_seconds: 90,
      rir: -1,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });

  it('should reject rir above 5', () => {
    const invalidData = {
      reps: 10,
      rest_seconds: 90,
      rir: 6,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });

  it('should reject decimal rir', () => {
    const invalidData = {
      reps: 10,
      rest_seconds: 90,
      rir: 2.5,
    };

    expect(() => aiSetSchema.parse(invalidData)).toThrow();
  });
});

describe('aiExerciseSchema', () => {
  it('should validate correct exercise with all fields', () => {
    const validData = {
      name: 'Bench Press',
      sets: [
        { reps: 10, weight: 80, rest_seconds: 90, rir: 2 },
        { reps: 10, weight: 80, rest_seconds: 90, rir: 2 },
      ],
      notes: 'Keep elbows at 45 degrees',
    };

    expect(() => aiExerciseSchema.parse(validData)).not.toThrow();
  });

  it('should validate exercise without optional notes', () => {
    const validData = {
      name: 'Bench Press',
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => aiExerciseSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty exercise name', () => {
    const invalidData = {
      name: '',
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => aiExerciseSchema.parse(invalidData)).toThrow();
  });

  it('should reject exercise name exceeding 100 characters', () => {
    const invalidData = {
      name: 'a'.repeat(101),
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => aiExerciseSchema.parse(invalidData)).toThrow();
  });

  it('should accept exercise name at exactly 100 characters', () => {
    const validData = {
      name: 'a'.repeat(100),
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => aiExerciseSchema.parse(validData)).not.toThrow();
  });

  it('should reject notes exceeding 500 characters', () => {
    const invalidData = {
      name: 'Bench Press',
      sets: [{ reps: 10, rest_seconds: 90 }],
      notes: 'a'.repeat(501),
    };

    expect(() => aiExerciseSchema.parse(invalidData)).toThrow();
  });

  it('should accept notes at exactly 500 characters', () => {
    const validData = {
      name: 'Bench Press',
      sets: [{ reps: 10, rest_seconds: 90 }],
      notes: 'a'.repeat(500),
    };

    expect(() => aiExerciseSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty sets array', () => {
    const invalidData = {
      name: 'Bench Press',
      sets: [],
    };

    expect(() => aiExerciseSchema.parse(invalidData)).toThrow();
  });
});

describe('aiWorkoutDaySchema', () => {
  it('should validate correct workout day', () => {
    const validData = {
      name: 'Push A',
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, weight: 80, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => aiWorkoutDaySchema.parse(validData)).not.toThrow();
  });

  it('should reject empty workout day name', () => {
    const invalidData = {
      name: '',
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => aiWorkoutDaySchema.parse(invalidData)).toThrow();
  });

  it('should reject workout day name exceeding 100 characters', () => {
    const invalidData = {
      name: 'a'.repeat(101),
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => aiWorkoutDaySchema.parse(invalidData)).toThrow();
  });

  it('should reject empty exercises array', () => {
    const invalidData = {
      name: 'Push A',
      exercises: [],
    };

    expect(() => aiWorkoutDaySchema.parse(invalidData)).toThrow();
  });

  it('should validate multiple exercises', () => {
    const validData = {
      name: 'Push A',
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
        {
          name: 'Overhead Press',
          sets: [{ reps: 8, rest_seconds: 120 }],
        },
      ],
    };

    expect(() => aiWorkoutDaySchema.parse(validData)).not.toThrow();
  });
});

describe('aiPlanSchema', () => {
  it('should validate correct AI plan', () => {
    const validData = {
      name: '4-week PPL Program',
      description: 'Progressive Push-Pull-Legs program for hypertrophy',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, weight: 80, rest_seconds: 90 }],
            },
          ],
        },
        {
          name: 'Pull A',
          exercises: [
            {
              name: 'Pull-ups',
              sets: [{ reps: 8, rest_seconds: 180 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 4,
    };

    expect(() => aiPlanSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty plan name', () => {
    const invalidData = {
      name: '',
      description: 'Test',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 4,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });

  it('should reject plan name exceeding 100 characters', () => {
    const invalidData = {
      name: 'a'.repeat(101),
      description: 'Test',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 4,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });

  it('should reject empty description', () => {
    const invalidData = {
      name: 'Test Plan',
      description: '',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 4,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });

  it('should reject description exceeding 500 characters', () => {
    const invalidData = {
      name: 'Test Plan',
      description: 'a'.repeat(501),
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 4,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });

  it('should reject empty schedule array', () => {
    const invalidData = {
      name: 'Test Plan',
      description: 'Test description',
      schedule: [],
      cycle_duration_weeks: 4,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });

  it('should reject negative cycle_duration_weeks', () => {
    const invalidData = {
      name: 'Test Plan',
      description: 'Test description',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: -2,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });

  it('should reject zero cycle_duration_weeks', () => {
    const invalidData = {
      name: 'Test Plan',
      description: 'Test description',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 0,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });

  it('should reject decimal cycle_duration_weeks', () => {
    const invalidData = {
      name: 'Test Plan',
      description: 'Test description',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 4.5,
    };

    expect(() => aiPlanSchema.parse(invalidData)).toThrow();
  });
});

describe('aiNextCycleSchema', () => {
  it('should validate correct next cycle data', () => {
    const validData = {
      name: 'PPL Cycle 2',
      description: 'Second cycle with increased weights',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, weight: 85, rest_seconds: 90 }],
            },
          ],
        },
      ],
    };

    expect(() => aiNextCycleSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty schedule', () => {
    const invalidData = {
      name: 'PPL Cycle 2',
      description: 'Second cycle',
      schedule: [],
    };

    expect(() => aiNextCycleSchema.parse(invalidData)).toThrow();
  });

  it('should not have cycle_duration_weeks field', () => {
    const dataWithDuration = {
      name: 'PPL Cycle 2',
      description: 'Second cycle',
      schedule: [
        {
          name: 'Push A',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
      cycle_duration_weeks: 4,
    };

    // Parse should succeed but the extra field should be stripped
    const result = aiNextCycleSchema.parse(dataWithDuration);
    expect('cycle_duration_weeks' in result).toBe(false);
  });
});
