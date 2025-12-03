import type { SupabaseClient } from "src/db/supabase.client";
import type { DashboardResponse, UpcomingWorkout, PlanStructure } from "src/types";

/**
 * Service for retrieving dashboard data
 * Handles aggregation of upcoming workouts and user state determination
 */
export class DashboardService {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  /**
   * Retrieves dashboard summary data for the authenticated user
   *
   * @returns Dashboard data including upcoming workouts and user state
   * @throws {Error} If database query fails
   */
  async getDashboardSummary(): Promise<DashboardResponse> {
    // Fetch active (non-archived) plans for the user with only necessary columns
    const { data: plans, error } = await this.supabase
      .from("plans")
      .select("id, name, plan")
      .eq("user_id", this.userId)
      .eq("archived", false);

    if (error) {
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }

    // No plans - new user
    if (!plans || plans.length === 0) {
      return {
        upcoming_workouts: [],
        user_state: "new",
      };
    }

    // Extract upcoming workouts from all plans
    const upcomingWorkouts = this.extractUpcomingWorkouts(plans as { id: string; name: string; plan: PlanStructure }[]);

    // Plans exist but no future workouts - completed state
    if (upcomingWorkouts.length === 0) {
      return {
        upcoming_workouts: [],
        user_state: "completed",
      };
    }

    // Active user with upcoming workouts
    return {
      upcoming_workouts: upcomingWorkouts,
      user_state: "active",
    };
  }

  /**
   * Extracts and processes upcoming workouts from plans
   *
   * @param plans - Array of plans with their structures
   * @returns Sorted array of upcoming workouts (max 10)
   */
  private extractUpcomingWorkouts(plans: { id: string; name: string; plan: PlanStructure }[]): UpcomingWorkout[] {
    const today = this.getTodayDateString();
    const workouts: UpcomingWorkout[] = [];

    for (const plan of plans) {
      const schedule = plan.plan?.schedule;

      // Skip plans without valid schedule
      if (!schedule) continue;

      for (const [date, workout] of Object.entries(schedule)) {
        // Skip past dates
        if (date < today) continue;

        // Skip completed workouts
        if (workout.done) continue;

        workouts.push({
          plan_id: plan.id,
          plan_name: plan.name,
          day_name: workout.name,
          date: date,
          is_next: false,
        });
      }
    }

    // Sort by date ascending
    workouts.sort((a, b) => a.date.localeCompare(b.date));

    // Mark the first workout as next
    if (workouts.length > 0) {
      workouts[0].is_next = true;
    }

    // Limit to 10 results for performance
    return workouts.slice(0, 10);
  }

  /**
   * Returns today's date as an ISO string (YYYY-MM-DD)
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split("T")[0];
  }
}
