import type { CreatePlanRequest, GeneratePlanResponse, PlanStructure, UserPreferences } from "src/types";

export class AiPlannerService {
  async generatePlanPreview(preferences: UserPreferences): Promise<GeneratePlanResponse> {
    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + preferences.cycle_duration_weeks * 7);

    const schedule: PlanStructure["schedule"] = {
      "2025-11-10": {
        name: "Push Day",
        done: false,
        exercises: [
          {
            name: "Bench Press",
            sets: [
              { reps: 8, weight: 80, rest_seconds: 90 },
              { reps: 8, weight: 80, rest_seconds: 90 },
              { reps: 8, weight: 80, rest_seconds: 90 },
            ],
          },
          {
            name: "Overhead Press",
            sets: [
              { reps: 10, weight: 50, rest_seconds: 60 },
              { reps: 10, weight: 50, rest_seconds: 60 },
              { reps: 10, weight: 50, rest_seconds: 60 },
            ],
          },
        ],
      },
      "2025-11-12": {
        name: "Pull Day",
        done: false,
        exercises: [
          {
            name: "Pull Ups",
            sets: [
              { reps: 8, rest_seconds: 90 },
              { reps: 8, rest_seconds: 90 },
              { reps: 8, rest_seconds: 90 },
            ],
          },
          {
            name: "Barbell Rows",
            sets: [
              { reps: 10, weight: 70, rest_seconds: 60 },
              { reps: 10, weight: 70, rest_seconds: 60 },
              { reps: 10, weight: 70, rest_seconds: 60 },
            ],
          },
        ],
      },
      "2025-11-14": {
        name: "Leg Day",
        done: false,
        exercises: [
          {
            name: "Squats",
            sets: [
              { reps: 8, weight: 100, rest_seconds: 120 },
              { reps: 8, weight: 100, rest_seconds: 120 },
              { reps: 8, weight: 100, rest_seconds: 120 },
            ],
          },
          {
            name: "Deadlifts",
            sets: [{ reps: 5, weight: 120, rest_seconds: 180 }],
          },
        ],
      },
    };

    const planData: Omit<CreatePlanRequest, "preferences"> & { schedule: PlanStructure["schedule"] } = {
      name: `${preferences.cycle_duration_weeks}-Week ${preferences.system} ${preferences.goal} Program`,
      effective_from: startDate.toISOString(),
      effective_to: endDate.toISOString(),
      source: "ai",
      plan: { schedule },
      schedule, // This seems redundant, but it's what the type is asking for
    };

    // Correctly structure the final response
    const response: GeneratePlanResponse = {
      plan: {
        name: planData.name,
        effective_from: planData.effective_from,
        effective_to: planData.effective_to,
        source: planData.source,
        plan: planData.plan,
        schedule: planData.schedule,
      },
      preferences,
      metadata: {
        model: "mock/gpt-4-turbo",
        generation_time_ms: 1450,
      },
    };

    return response;
  }
}
