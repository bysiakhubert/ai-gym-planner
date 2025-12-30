import { describe, it, expect } from 'vitest';
import {
  SetFormSchema,
  ExerciseFormSchema,
  DayFormSchema,
  PlanEditorFormSchema,
  defaultSetValues,
  defaultExerciseValues,
  createDefaultDayValues,
  getNextDayDate,
} from '@/lib/schemas/plan-editor';

describe('SetFormSchema', () => {
  it('should validate correct set data', () => {
    const validData = {
      reps: 10,
      weight: 80,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(validData)).not.toThrow();
  });

  it('should coerce string reps to number', () => {
    const data = {
      reps: '10',
      rest_seconds: '90',
    };

    const result = SetFormSchema.parse(data);
    expect(result.reps).toBe(10);
    expect(typeof result.reps).toBe('number');
  });

  it('should accept null weight', () => {
    const validData = {
      reps: 10,
      weight: null,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(validData)).not.toThrow();
  });

  it('should accept undefined weight', () => {
    const validData = {
      reps: 10,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(validData)).not.toThrow();
  });

  it('should accept zero weight', () => {
    const validData = {
      reps: 10,
      weight: 0,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject negative reps', () => {
    const invalidData = {
      reps: -5,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(invalidData)).toThrow('Powtórzenia muszą być większe od 0');
  });

  it('should reject zero reps', () => {
    const invalidData = {
      reps: 0,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(invalidData)).toThrow();
  });

  it('should reject decimal reps', () => {
    const invalidData = {
      reps: 10.5,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(invalidData)).toThrow('Powtórzenia muszą być liczbą całkowitą');
  });

  it('should reject negative weight', () => {
    const invalidData = {
      reps: 10,
      weight: -10,
      rest_seconds: 90,
    };

    expect(() => SetFormSchema.parse(invalidData)).toThrow('Ciężar nie może być ujemny');
  });

  it('should reject negative rest_seconds', () => {
    const invalidData = {
      reps: 10,
      rest_seconds: -30,
    };

    expect(() => SetFormSchema.parse(invalidData)).toThrow('Przerwa nie może być ujemna');
  });

  it('should accept zero rest_seconds', () => {
    const validData = {
      reps: 10,
      rest_seconds: 0,
    };

    expect(() => SetFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject non-integer rest_seconds', () => {
    const invalidData = {
      reps: 10,
      rest_seconds: 90.5,
    };

    expect(() => SetFormSchema.parse(invalidData)).toThrow('Przerwa musi być liczbą całkowitą');
  });
});

describe('ExerciseFormSchema', () => {
  it('should validate correct exercise data', () => {
    const validData = {
      name: 'Bench Press',
      sets: [
        { reps: 10, weight: 80, rest_seconds: 90 },
        { reps: 10, weight: 80, rest_seconds: 90 },
      ],
    };

    expect(() => ExerciseFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty exercise name', () => {
    const invalidData = {
      name: '',
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => ExerciseFormSchema.parse(invalidData)).toThrow('Nazwa ćwiczenia jest wymagana');
  });

  it('should reject exercise name exceeding 100 characters', () => {
    const invalidData = {
      name: 'a'.repeat(101),
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => ExerciseFormSchema.parse(invalidData)).toThrow('Nazwa ćwiczenia może mieć maksymalnie 100 znaków');
  });

  it('should accept exercise name at exactly 100 characters', () => {
    const validData = {
      name: 'a'.repeat(100),
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => ExerciseFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty sets array', () => {
    const invalidData = {
      name: 'Bench Press',
      sets: [],
    };

    expect(() => ExerciseFormSchema.parse(invalidData)).toThrow('Ćwiczenie musi mieć co najmniej jedną serię');
  });

  it('should validate exercise with single set', () => {
    const validData = {
      name: 'Bench Press',
      sets: [{ reps: 10, rest_seconds: 90 }],
    };

    expect(() => ExerciseFormSchema.parse(validData)).not.toThrow();
  });
});

describe('DayFormSchema', () => {
  it('should validate correct day data', () => {
    const validData = {
      date: '2025-12-30',
      name: 'Push Day',
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => DayFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject invalid date format (slash)', () => {
    const invalidData = {
      date: '2025/12/30',
      name: 'Push Day',
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => DayFormSchema.parse(invalidData)).toThrow('Data musi być w formacie YYYY-MM-DD');
  });

  it('should reject datetime string', () => {
    const invalidData = {
      date: '2025-12-30T00:00:00.000Z',
      name: 'Push Day',
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => DayFormSchema.parse(invalidData)).toThrow();
  });

  it('should reject empty day name', () => {
    const invalidData = {
      date: '2025-12-30',
      name: '',
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => DayFormSchema.parse(invalidData)).toThrow('Nazwa dnia jest wymagana');
  });

  it('should reject day name exceeding 100 characters', () => {
    const invalidData = {
      date: '2025-12-30',
      name: 'a'.repeat(101),
      exercises: [
        {
          name: 'Bench Press',
          sets: [{ reps: 10, rest_seconds: 90 }],
        },
      ],
    };

    expect(() => DayFormSchema.parse(invalidData)).toThrow('Nazwa dnia może mieć maksymalnie 100 znaków');
  });

  it('should reject empty exercises array', () => {
    const invalidData = {
      date: '2025-12-30',
      name: 'Push Day',
      exercises: [],
    };

    expect(() => DayFormSchema.parse(invalidData)).toThrow('Dzień treningowy musi mieć co najmniej jedno ćwiczenie');
  });
});

describe('PlanEditorFormSchema', () => {
  it('should validate correct plan editor data', () => {
    const validData = {
      name: 'Test Plan',
      effective_from: '2025-12-30',
      effective_to: '2026-01-27',
      days: [
        {
          date: '2025-12-30',
          name: 'Push Day',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
    };

    expect(() => PlanEditorFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject when effective_to is before effective_from', () => {
    const invalidData = {
      name: 'Test Plan',
      effective_from: '2026-01-27',
      effective_to: '2025-12-30',
      days: [
        {
          date: '2025-12-30',
          name: 'Push Day',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
    };

    expect(() => PlanEditorFormSchema.parse(invalidData)).toThrow(
      'Data zakończenia musi być późniejsza lub równa dacie rozpoczęcia'
    );
  });

  it('should accept when effective_to equals effective_from', () => {
    const validData = {
      name: 'Test Plan',
      effective_from: '2025-12-30',
      effective_to: '2025-12-30',
      days: [
        {
          date: '2025-12-30',
          name: 'Push Day',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
    };

    expect(() => PlanEditorFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject duplicate dates in days array', () => {
    const invalidData = {
      name: 'Test Plan',
      effective_from: '2025-12-30',
      effective_to: '2026-01-27',
      days: [
        {
          date: '2025-12-30',
          name: 'Push Day',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
        {
          date: '2025-12-30',
          name: 'Pull Day',
          exercises: [
            {
              name: 'Pull-ups',
              sets: [{ reps: 8, rest_seconds: 180 }],
            },
          ],
        },
      ],
    };

    expect(() => PlanEditorFormSchema.parse(invalidData)).toThrow('Daty dni treningowych muszą być unikalne');
  });

  it('should accept unique dates', () => {
    const validData = {
      name: 'Test Plan',
      effective_from: '2025-12-30',
      effective_to: '2026-01-27',
      days: [
        {
          date: '2025-12-30',
          name: 'Push Day',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
        {
          date: '2025-12-31',
          name: 'Pull Day',
          exercises: [
            {
              name: 'Pull-ups',
              sets: [{ reps: 8, rest_seconds: 180 }],
            },
          ],
        },
      ],
    };

    expect(() => PlanEditorFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty plan name', () => {
    const invalidData = {
      name: '',
      effective_from: '2025-12-30',
      effective_to: '2026-01-27',
      days: [
        {
          date: '2025-12-30',
          name: 'Push Day',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ reps: 10, rest_seconds: 90 }],
            },
          ],
        },
      ],
    };

    expect(() => PlanEditorFormSchema.parse(invalidData)).toThrow('Nazwa planu jest wymagana');
  });

  it('should reject empty days array', () => {
    const invalidData = {
      name: 'Test Plan',
      effective_from: '2025-12-30',
      effective_to: '2026-01-27',
      days: [],
    };

    expect(() => PlanEditorFormSchema.parse(invalidData)).toThrow('Plan musi zawierać co najmniej jeden dzień treningowy');
  });
});

describe('defaultSetValues', () => {
  it('should have correct default values', () => {
    expect(defaultSetValues).toEqual({
      reps: 10,
      weight: null,
      rest_seconds: 90,
    });
  });
});

describe('defaultExerciseValues', () => {
  it('should have correct default values', () => {
    expect(defaultExerciseValues.name).toBe('');
    expect(defaultExerciseValues.sets).toHaveLength(1);
    expect(defaultExerciseValues.sets[0]).toEqual(defaultSetValues);
  });
});

describe('createDefaultDayValues', () => {
  it('should create day with correct date', () => {
    const date = '2025-12-30';
    const result = createDefaultDayValues(date);

    expect(result.date).toBe(date);
    expect(result.name).toBe('');
    expect(result.exercises).toHaveLength(1);
  });

  it('should create day with default exercise and set', () => {
    const result = createDefaultDayValues('2025-12-30');

    expect(result.exercises[0].name).toBe('');
    expect(result.exercises[0].sets[0]).toEqual(defaultSetValues);
  });
});

describe('getNextDayDate', () => {
  it('should return today when days array is empty', () => {
    const result = getNextDayDate([]);
    const today = new Date().toISOString().split('T')[0];

    expect(result).toBe(today);
  });

  it('should return next day after last date', () => {
    const days = [
      createDefaultDayValues('2025-12-30'),
      createDefaultDayValues('2025-12-31'),
    ];

    const result = getNextDayDate(days);
    expect(result).toBe('2026-01-01');
  });

  it('should handle month transition correctly', () => {
    const days = [createDefaultDayValues('2025-11-30')];

    const result = getNextDayDate(days);
    expect(result).toBe('2025-12-01');
  });

  it('should handle year transition correctly', () => {
    const days = [createDefaultDayValues('2025-12-31')];

    const result = getNextDayDate(days);
    expect(result).toBe('2026-01-01');
  });

  it('should handle leap year correctly', () => {
    const days = [createDefaultDayValues('2024-02-28')];

    const result = getNextDayDate(days);
    expect(result).toBe('2024-02-29');
  });

  it('should handle non-leap year correctly', () => {
    const days = [createDefaultDayValues('2025-02-28')];

    const result = getNextDayDate(days);
    expect(result).toBe('2025-03-01');
  });
});
