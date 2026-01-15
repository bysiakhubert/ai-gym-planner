import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";
import type { PlanStructure, SessionStructure } from "../../src/types";

/**
 * Test data seeder for E2E tests
 * Creates test plans and sessions for authenticated tests
 */

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

// Create admin client with service role key for seeding operations
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Gets the test user ID from auth.users table by email
 * This ensures we use the correct user ID that matches the logged-in session
 */
async function getTestUserId(): Promise<string> {
  const testEmail = process.env.E2E_USERNAME;

  if (!testEmail) {
    throw new Error("E2E_USERNAME not set - cannot get test user ID");
  }

  // Query auth.users to get the actual user ID
  const { data, error } = await supabaseAdmin
    .from("plans") // We can't directly query auth.users, so we'll use the stored ID
    .select("user_id")
    .limit(1)
    .maybeSingle();

  // If no plans exist, fallback to E2E_USERNAME_ID
  if (error || !data) {
    const fallbackId = process.env.E2E_USERNAME_ID;
    if (!fallbackId) {
      throw new Error("Cannot determine test user ID - no plans exist and E2E_USERNAME_ID not set");
    }
    return fallbackId;
  }

  return data.user_id;
}

/**
 * Creates a test plan with a simple workout schedule
 * @returns The created plan's ID
 */
export async function createTestPlan(): Promise<string> {
  const testUserId = await getTestUserId();

  // Create a simple plan with workouts for today and tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayKey = today.toISOString().split("T")[0];
  const tomorrowKey = tomorrow.toISOString().split("T")[0];

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 28); // 4 weeks

  const planStructure: PlanStructure = {
    schedule: {
      [todayKey]: {
        name: "Push Day - E2E Test",
        done: false,
        exercises: [
          {
            name: "Bench Press",
            sets: [
              { reps: 10, weight: 80, rest_seconds: 90 },
              { reps: 10, weight: 80, rest_seconds: 90 },
              { reps: 10, weight: 80, rest_seconds: 90 },
            ],
          },
          {
            name: "Overhead Press",
            sets: [
              { reps: 8, weight: 50, rest_seconds: 120 },
              { reps: 8, weight: 50, rest_seconds: 120 },
            ],
          },
        ],
      },
      [tomorrowKey]: {
        name: "Pull Day - E2E Test",
        done: false,
        exercises: [
          {
            name: "Pull-ups",
            sets: [
              { reps: 8, rest_seconds: 180 },
              { reps: 8, rest_seconds: 180 },
              { reps: 8, rest_seconds: 180 },
            ],
          },
          {
            name: "Barbell Row",
            sets: [
              { reps: 10, weight: 60, rest_seconds: 120 },
              { reps: 10, weight: 60, rest_seconds: 120 },
            ],
          },
        ],
      },
    },
  };

  const { data, error } = await supabaseAdmin
    .from("plans")
    .insert({
      user_id: testUserId,
      name: "E2E Test Plan",
      effective_from: today.toISOString(),
      effective_to: endDate.toISOString(),
      source: "manual",
      preferences: {
        goal: "hipertrofia",
        system: "PPL",
        available_days: ["monday", "wednesday", "friday"],
        session_duration_minutes: 60,
        cycle_duration_weeks: 4,
      },
      plan: planStructure,
      archived: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating test plan:", error);
    throw new Error(`Failed to create test plan: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned when creating test plan");
  }

  console.log("✅ Test plan created:", data.id);

  // Small delay to ensure plan is fully committed to database
  // This prevents race conditions where the test loads the page before the plan is visible
  await new Promise((resolve) => setTimeout(resolve, 200));

  return data.id;
}

/**
 * Creates an active test session for a given plan
 * @param planId - The plan ID to create a session for
 * @returns The created session's ID
 */
export async function createTestSession(planId: string): Promise<string> {
  const testUserId = process.env.E2E_USERNAME_ID;

  if (!testUserId) {
    throw new Error("E2E_USERNAME_ID not set - cannot create test session");
  }

  // Get the plan to extract workout data
  const { data: plan, error: planError } = await supabaseAdmin.from("plans").select("*").eq("id", planId).single();

  if (planError || !plan) {
    throw new Error(`Failed to fetch plan for session: ${planError?.message}`);
  }

  const today = new Date().toISOString().split("T")[0];
  const planStructure = plan.plan as PlanStructure;
  const todayWorkout = planStructure.schedule[today];

  if (!todayWorkout) {
    throw new Error("No workout found for today in the test plan");
  }

  // Create session structure from plan
  const sessionStructure: SessionStructure = {
    plan_name: plan.name,
    day_name: todayWorkout.name,
    date: today,
    exercises: todayWorkout.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        planned_reps: set.reps,
        planned_weight: set.weight,
        actual_reps: null,
        actual_weight: null,
        rest_seconds: set.rest_seconds,
        completed: false,
      })),
    })),
  };

  const { data, error } = await supabaseAdmin
    .from("training_sessions")
    .insert({
      user_id: testUserId,
      plan_id: planId,
      started_at: new Date().toISOString(),
      ended_at: null,
      session: sessionStructure,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating test session:", error);
    throw new Error(`Failed to create test session: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned when creating test session");
  }

  console.log("✅ Test session created:", data.id);

  // Small delay to ensure session is fully committed to database
  await new Promise((resolve) => setTimeout(resolve, 200));

  return data.id;
}

/**
 * Creates a complete test setup: plan + active session
 * @returns Object with planId and sessionId
 */
export async function seedTestData(): Promise<{ planId: string; sessionId: string }> {
  const planId = await createTestPlan();
  const sessionId = await createTestSession(planId);

  return { planId, sessionId };
}

/**
 * Creates only a test plan (without session)
 * Useful for tests that need to start a workout from dashboard
 * @returns The created plan's ID
 */
export async function seedTestPlanOnly(): Promise<string> {
  return await createTestPlan();
}

/**
 * Verifies that test data exists (plan and session)
 * @returns true if both plan and session exist
 */
export async function verifyTestDataExists(): Promise<boolean> {
  const testUserId = process.env.E2E_USERNAME_ID;

  if (!testUserId) {
    return false;
  }

  // Check for plans
  const { data: plans, error: plansError } = await supabaseAdmin
    .from("plans")
    .select("id")
    .eq("user_id", testUserId)
    .limit(1);

  if (plansError || !plans || plans.length === 0) {
    return false;
  }

  // Check for active session
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("training_sessions")
    .select("id")
    .eq("user_id", testUserId)
    .is("ended_at", null)
    .limit(1);

  if (sessionsError || !sessions || sessions.length === 0) {
    return false;
  }

  return true;
}
