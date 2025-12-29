import type {
  GeneratePlanResponse,
  GenerateNextCycleResponse,
  PlanStructure,
  PlanResponse,
  UserPreferences,
} from "src/types";
import type { CompletedSessionData } from "./sessionService";
import { openRouterService } from "./openRouterService";
import { aiPlanSchema, type AiPlanResponse } from "../schemas/ai-response";
import { SYSTEM_MESSAGE, formatUserPrompt, sanitizeUserInput } from "./aiPrompts";

export class AiPlannerService {
  /**
   * Generates an AI-powered workout plan preview based on user preferences
   * @param preferences - User workout preferences
   * @returns Generated plan with metadata
   * @throws {OpenRouterError} If AI generation fails
   */
  async generatePlanPreview(preferences: UserPreferences): Promise<GeneratePlanResponse> {
    const startTime = Date.now();

    // Sanitize user notes to prevent prompt injection
    const sanitizedPreferences = {
      ...preferences,
      notes: preferences.notes ? sanitizeUserInput(preferences.notes) : undefined,
    };

    // Build AI prompts
    const systemPrompt = SYSTEM_MESSAGE;
    const userPrompt = formatUserPrompt(sanitizedPreferences);

    // Call OpenRouter API with structured output and fallback support
    const completionResult = await openRouterService.generateStructuredCompletion<AiPlanResponse>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      aiPlanSchema
    );

    const aiResponse = completionResult.data;
    const modelUsed = completionResult.model;
    const fallbackUsed = completionResult.fallbackUsed;

    // Map AI response to domain format (PlanStructure)
    const schedule = this.mapAiResponseToSchedule(aiResponse, preferences);

    // Calculate plan dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + preferences.cycle_duration_weeks * 7);

    const generationTimeMs = Date.now() - startTime;

    // Build response
    const response: GeneratePlanResponse = {
      plan: {
        name: aiResponse.name,
        effective_from: startDate.toISOString(),
        effective_to: endDate.toISOString(),
        source: "ai",
        plan: { schedule },
        schedule,
      },
      preferences,
      metadata: {
        model: modelUsed,
        generation_time_ms: generationTimeMs,
        fallback_used: fallbackUsed,
      },
    };

    return response;
  }

  /**
   * Generates a preview for the next training cycle based on performance history
   *
   * Analyzes completed sessions from the current plan and suggests progressions
   * (increased weights, volume adjustments, exercise variations).
   *
   * @param currentPlan - The current plan to base progression on
   * @param sessionHistory - Array of completed session data for analysis
   * @param cycleDurationWeeks - Duration of the new cycle in weeks
   * @param notes - Optional specific focus areas or instructions
   * @returns Generated plan preview with progression summary
   * @throws {OpenRouterError} If AI generation fails
   */
  async generateNextCycle(
    currentPlan: PlanResponse,
    sessionHistory: CompletedSessionData[],
    cycleDurationWeeks: number,
    notes?: string
  ): Promise<GenerateNextCycleResponse> {
    const startTime = Date.now();

    // For now, use traditional progression logic
    // TODO: In future, could use AI to analyze session history and suggest smart progressions

    // Calculate new cycle dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + cycleDurationWeeks * 7);

    // Analyze session history for progression
    const progressionChanges = this.analyzeProgressionChanges(sessionHistory, notes);

    // Generate new schedule with progressions applied
    const newSchedule = this.generateProgressedSchedule(currentPlan.plan.schedule, sessionHistory, cycleDurationWeeks);

    // Build the new plan name
    const currentPreferences = currentPlan.preferences as UserPreferences;
    const planName = currentPreferences?.system
      ? `${cycleDurationWeeks}-Week ${currentPreferences.system} ${currentPreferences.goal || "Training"} Program (Cycle 2)`
      : `${currentPlan.name} - Next Cycle`;

    const generationTimeMs = Date.now() - startTime;

    return {
      plan: {
        name: planName,
        effective_from: startDate.toISOString(),
        effective_to: endDate.toISOString(),
        schedule: newSchedule,
      },
      progression_summary: {
        changes: progressionChanges,
      },
      metadata: {
        model: "traditional-progression",
        generation_time_ms: generationTimeMs,
      },
    };
  }

  /**
   * Maps AI response structure to application's schedule format
   * Distributes workout days across the specified cycle duration
   * @private
   */
  private mapAiResponseToSchedule(aiResponse: AiPlanResponse, preferences: UserPreferences): PlanStructure["schedule"] {
    const schedule: PlanStructure["schedule"] = {};
    const startDate = new Date();
    const { cycle_duration_weeks } = preferences;

    // Calculate total days in cycle
    const totalDays = cycle_duration_weeks * 7;
    const workoutDays = aiResponse.schedule;
    const daysPerWeek = workoutDays.length;

    // Distribute workouts evenly across the cycle
    let currentDay = 0;
    const daysBetweenWorkouts = Math.floor(7 / daysPerWeek);

    for (let week = 0; week < cycle_duration_weeks; week++) {
      for (let workoutIndex = 0; workoutIndex < daysPerWeek; workoutIndex++) {
        const workoutDate = new Date(startDate);
        workoutDate.setDate(startDate.getDate() + currentDay);

        const dateKey = workoutDate.toISOString().split("T")[0];
        const aiWorkout = workoutDays[workoutIndex];

        // Map AI workout to application format
        schedule[dateKey] = {
          name: aiWorkout.name,
          done: false,
          exercises: aiWorkout.exercises.map((exercise) => ({
            name: exercise.name,
            sets: exercise.sets.map((set) => ({
              reps: set.reps,
              weight: set.weight,
              rest_seconds: set.rest_seconds,
            })),
          })),
        };

        currentDay += daysBetweenWorkouts;
        if (currentDay >= totalDays) break;
      }
      if (currentDay >= totalDays) break;
    }

    return schedule;
  }

  /**
   * Analyzes session history to determine progression changes
   * @private
   */
  private analyzeProgressionChanges(sessionHistory: CompletedSessionData[], notes?: string): string[] {
    const changes: string[] = [];

    // Add note-based changes first if provided (highest priority)
    if (notes) {
      changes.push(`Uwagi użytkownika uwzględnione: ${notes}`);
    }

    // When no session history exists, just copy the plan structure
    if (sessionHistory.length === 0) {
      changes.push("Zachowano strukturę poprzedniego planu (brak historii treningowej)");
      return changes;
    }

    // Analyze completed sessions for progression opportunities
    const exercisePerformance = new Map<string, { totalSets: number; completedSets: number }>();

    for (const session of sessionHistory) {
      for (const exercise of session.exercises) {
        const current = exercisePerformance.get(exercise.name) || { totalSets: 0, completedSets: 0 };
        for (const set of exercise.sets) {
          current.totalSets++;
          if (set.completed) {
            current.completedSets++;
          }
        }
        exercisePerformance.set(exercise.name, current);
      }
    }

    // Generate progression recommendations
    for (const [exerciseName, stats] of exercisePerformance) {
      const completionRate = stats.completedSets / stats.totalSets;
      if (completionRate >= 0.9) {
        const msg = `Zwiększono ciężar dla ${exerciseName} o 5% (wykonanie: ${Math.round(completionRate * 100)}%)`;
        changes.push(msg);
      } else if (completionRate < 0.7) {
        const msg = `Utrzymano lub zmniejszono ciężar dla ${exerciseName} (wykonanie: ${Math.round(completionRate * 100)}%)`;
        changes.push(msg);
      }
    }

    if (changes.length === 0 || (changes.length === 1 && notes)) {
      changes.push("Utrzymano dotychczasową progresję - wszystkie ćwiczenia na optymalnym poziomie wykonania");
    }

    return changes;
  }

  /**
   * Generates a new schedule with progressions applied
   * @private
   */
  private generateProgressedSchedule(
    currentSchedule: PlanStructure["schedule"],
    sessionHistory: CompletedSessionData[],
    cycleDurationWeeks: number
  ): PlanStructure["schedule"] {
    const newSchedule: PlanStructure["schedule"] = {};
    const startDate = new Date();

    // Get unique workout days from current schedule
    const workoutDays = Object.values(currentSchedule);
    const uniqueWorkouts = new Map<string, (typeof workoutDays)[0]>();

    for (const workout of workoutDays) {
      if (!uniqueWorkouts.has(workout.name)) {
        uniqueWorkouts.set(workout.name, workout);
      }
    }

    // Calculate performance-based weight adjustments
    const weightAdjustments = this.calculateWeightAdjustments(sessionHistory);

    // Distribute workouts across the new cycle
    let dayOffset = 0;
    const workoutPatterns = Array.from(uniqueWorkouts.values());

    for (let week = 0; week < cycleDurationWeeks; week++) {
      for (let i = 0; i < workoutPatterns.length && dayOffset < cycleDurationWeeks * 7; i++) {
        const workout = workoutPatterns[i];
        const workoutDate = new Date(startDate);
        workoutDate.setDate(startDate.getDate() + dayOffset);

        const dateKey = workoutDate.toISOString().split("T")[0];

        // Apply weight progressions to exercises
        const progressedExercises = workout.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({
            ...set,
            weight: set.weight ? Math.round(set.weight * (1 + (weightAdjustments.get(exercise.name) || 0))) : undefined,
          })),
        }));

        newSchedule[dateKey] = {
          name: workout.name,
          exercises: progressedExercises,
          done: false,
        };

        dayOffset += 2; // Space workouts by 2 days
      }
    }

    return newSchedule;
  }

  /**
   * Calculates weight adjustment percentages based on session history
   * @private
   */
  private calculateWeightAdjustments(sessionHistory: CompletedSessionData[]): Map<string, number> {
    const adjustments = new Map<string, number>();

    if (sessionHistory.length === 0) {
      return adjustments;
    }

    // Group performance by exercise
    const exerciseStats = new Map<string, { completed: number; total: number }>();

    for (const session of sessionHistory) {
      for (const exercise of session.exercises) {
        const stats = exerciseStats.get(exercise.name) || { completed: 0, total: 0 };
        for (const set of exercise.sets) {
          stats.total++;
          if (set.completed && set.actual_reps && set.actual_reps >= set.planned_reps) {
            stats.completed++;
          }
        }
        exerciseStats.set(exercise.name, stats);
      }
    }

    // Calculate adjustments based on completion rates
    for (const [exerciseName, stats] of exerciseStats) {
      const completionRate = stats.total > 0 ? stats.completed / stats.total : 0;

      if (completionRate >= 0.9) {
        adjustments.set(exerciseName, 0.05); // 5% increase
      } else if (completionRate >= 0.75) {
        adjustments.set(exerciseName, 0.025); // 2.5% increase
      } else if (completionRate < 0.5) {
        adjustments.set(exerciseName, -0.05); // 5% decrease
      } else {
        adjustments.set(exerciseName, 0); // Maintain
      }
    }

    return adjustments;
  }
}
