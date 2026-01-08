import type {
  GeneratePlanResponse,
  GenerateNextCycleResponse,
  PlanStructure,
  PlanResponse,
  UserPreferences,
} from "src/types";
import type { CompletedSessionData } from "./sessionService";
import { openRouterService } from "./openRouterService";
import { aiPlanSchema, aiNextCycleSchema, type AiPlanResponse, type AiNextCycleResponse } from "../schemas/ai-response";
import { SYSTEM_MESSAGE, formatUserPrompt, formatNextCyclePrompt, sanitizeUserInput } from "./aiPrompts";

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
   * Uses AI to analyze completed sessions from the current plan and suggest smart progressions
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

    // Sanitize user notes to prevent prompt injection
    const sanitizedNotes = notes ? sanitizeUserInput(notes) : undefined;

    // Calculate new cycle dates - start after the current plan ends
    const currentPlanEndDate = new Date(currentPlan.effective_to);
    const startDate = new Date(currentPlanEndDate);
    startDate.setDate(currentPlanEndDate.getDate() + 1); // Start the day after current plan ends

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + cycleDurationWeeks * 7);

    // Build AI prompts
    const systemPrompt = SYSTEM_MESSAGE;
    const userPrompt = formatNextCyclePrompt(
      { name: currentPlan.name, schedule: currentPlan.plan.schedule },
      currentPlan.preferences,
      sessionHistory,
      cycleDurationWeeks,
      sanitizedNotes
    );

    // Call OpenRouter API with structured output and fallback support
    const completionResult = await openRouterService.generateStructuredCompletion<AiNextCycleResponse>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      aiNextCycleSchema
    );

    const aiResponse = completionResult.data;
    const modelUsed = completionResult.model;
    const fallbackUsed = completionResult.fallbackUsed;

    // Map AI response to domain format (PlanStructure)
    const schedule = this.mapAiResponseToSchedule({ ...aiResponse, cycle_duration_weeks: cycleDurationWeeks }, {
      cycle_duration_weeks: cycleDurationWeeks,
    } as UserPreferences);

    // Analyze progression changes for summary
    const progressionChanges = this.analyzeAiProgressionChanges(
      currentPlan.plan.schedule,
      schedule,
      aiResponse.description
    );

    const generationTimeMs = Date.now() - startTime;

    // Build response
    const response: GenerateNextCycleResponse = {
      plan: {
        name: aiResponse.name,
        effective_from: startDate.toISOString(),
        effective_to: endDate.toISOString(),
        schedule,
      },
      progression_summary: {
        changes: progressionChanges,
      },
      metadata: {
        model: modelUsed,
        generation_time_ms: generationTimeMs,
      },
    };

    // Log if fallback was used
    if (fallbackUsed) {
      // eslint-disable-next-line no-console
      console.info(`AI generation fallback used: ${modelUsed} (primary model failed)`);
    }

    return response;
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
   * Analyzes AI-generated progression changes by comparing old and new schedules
   * @private
   */
  private analyzeAiProgressionChanges(
    oldSchedule: PlanStructure["schedule"],
    newSchedule: PlanStructure["schedule"],
    aiDescription: string
  ): string[] {
    const changes: string[] = [];

    // Add AI's description as first change summary
    if (aiDescription) {
      changes.push(aiDescription);
    }

    // Get unique workout days from both schedules
    const oldDays = new Map<
      string,
      { name: string; exercises: { name: string; sets: { reps: number; weight?: number }[] }[] }
    >();
    const newDays = new Map<
      string,
      { name: string; exercises: { name: string; sets: { reps: number; weight?: number }[] }[] }
    >();

    for (const day of Object.values(oldSchedule)) {
      if (!oldDays.has(day.name)) {
        oldDays.set(day.name, day);
      }
    }

    for (const day of Object.values(newSchedule)) {
      if (!newDays.has(day.name)) {
        newDays.set(day.name, day);
      }
    }

    // Compare exercises between old and new
    for (const [dayName, oldDay] of oldDays) {
      const newDay = newDays.get(dayName);
      if (!newDay) continue;

      for (const oldExercise of oldDay.exercises) {
        const newExercise = newDay.exercises.find((e) => e.name === oldExercise.name);

        if (newExercise) {
          // Compare weights
          const oldAvgWeight = oldExercise.sets.reduce((sum, s) => sum + (s.weight || 0), 0) / oldExercise.sets.length;
          const newAvgWeight = newExercise.sets.reduce((sum, s) => sum + (s.weight || 0), 0) / newExercise.sets.length;

          if (newAvgWeight > oldAvgWeight && oldAvgWeight > 0) {
            const increase = Math.round(((newAvgWeight - oldAvgWeight) / oldAvgWeight) * 100);
            changes.push(
              `${oldExercise.name}: zwiększono ciężar o ${increase}% (${Math.round(oldAvgWeight)}kg → ${Math.round(newAvgWeight)}kg)`
            );
          }

          // Compare volume (sets × reps)
          const oldVolume = oldExercise.sets.reduce((sum, s) => sum + s.reps, 0);
          const newVolume = newExercise.sets.reduce((sum, s) => sum + s.reps, 0);

          if (newVolume > oldVolume) {
            changes.push(`${oldExercise.name}: zwiększono objętość (${oldVolume} → ${newVolume} powtórzeń)`);
          }
        }
      }

      // Check for new exercises
      for (const newExercise of newDay.exercises) {
        const isNew = !oldDay.exercises.some((e) => e.name === newExercise.name);
        if (isNew) {
          changes.push(`Dodano nowe ćwiczenie: ${newExercise.name} (${dayName})`);
        }
      }
    }

    // If no specific changes found, provide general message
    if (changes.length === 1 && aiDescription) {
      // Only AI description
      changes.push("Plan został dostosowany z uwzględnieniem progresji i dotychczasowych wyników");
    } else if (changes.length === 0) {
      changes.push("Zachowano strukturę planu z drobnymi optymalizacjami");
    }

    return changes;
  }

  /**
   * Analyzes session history to determine progression changes (legacy method for non-AI)
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
    cycleDurationWeeks: number,
    startDate: Date
  ): PlanStructure["schedule"] {
    const newSchedule: PlanStructure["schedule"] = {};

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
