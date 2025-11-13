import type { SupabaseClient } from "src/db/supabase.client";
import type { CreatePlanRequest, PlanResponse, UserPreferences, PlanStructure } from "src/types";
import type { Json } from "src/db/database.types";
import { auditLogService } from "./auditLogService";

/**
 * Custom error class for date overlap conflicts
 */
export class DateOverlapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DateOverlapError";
  }
}

/**
 * Service for managing training plans
 * Handles CRUD operations, validation, and business logic for plans
 */
export const planService = {
  /**
   * Creates a new training plan
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user creating the plan
   * @param data - Plan creation data
   * @returns The newly created plan
   * @throws {DateOverlapError} If the plan dates overlap with existing non-archived plans
   * @throws {Error} If database operation fails
   */
  createPlan: async (supabase: SupabaseClient, userId: string, data: CreatePlanRequest): Promise<PlanResponse> => {
    // Step 1: Check for date overlaps with existing non-archived plans
    const { data: existingPlans, error: checkError } = await supabase
      .from("plans")
      .select("id, name, effective_from, effective_to")
      .eq("user_id", userId)
      .eq("archived", false)
      .or(`and(effective_from.lte.${data.effective_to},effective_to.gte.${data.effective_from})`);

    if (checkError) {
      throw new Error(`Failed to check for overlapping plans: ${checkError.message}`);
    }

    // If there are any overlapping plans, throw an error
    if (existingPlans && existingPlans.length > 0) {
      const overlappingPlan = existingPlans[0];
      throw new DateOverlapError(
        `Plan dates overlap with existing plan "${overlappingPlan.name}" (${overlappingPlan.effective_from} to ${overlappingPlan.effective_to})`
      );
    }

    // Step 2: Create the plan insert object
    const planInsert = {
      user_id: userId,
      name: data.name,
      effective_from: data.effective_from,
      effective_to: data.effective_to,
      source: data.source,
      prompt: data.prompt ?? null,
      preferences: data.preferences as unknown as Json,
      plan: data.plan as unknown as Json,
      archived: false,
    };

    // Step 3: Insert the plan into the database
    const { data: newPlan, error: insertError } = await supabase.from("plans").insert(planInsert).select().single();

    if (insertError) {
      throw new Error(`Failed to create plan: ${insertError.message}`);
    }

    if (!newPlan) {
      throw new Error("Plan was not returned after creation");
    }

    // Step 4: Log audit events
    // Always log plan_created event
    await auditLogService.logEvent(supabase, userId, "plan_created", {
      entityType: "plan",
      entityId: newPlan.id,
      payload: {
        plan_name: newPlan.name,
        source: newPlan.source,
        effective_from: newPlan.effective_from,
        effective_to: newPlan.effective_to,
      },
    });

    // If source is "ai", also log plan_accepted event
    if (data.source === "ai") {
      await auditLogService.logEvent(supabase, userId, "plan_accepted", {
        entityType: "plan",
        entityId: newPlan.id,
        payload: {
          plan_name: newPlan.name,
          prompt: data.prompt,
        },
      });
    }

    // Step 5: Return the created plan as PlanResponse
    return {
      id: newPlan.id,
      user_id: newPlan.user_id,
      name: newPlan.name,
      effective_from: newPlan.effective_from,
      effective_to: newPlan.effective_to,
      source: newPlan.source,
      prompt: newPlan.prompt,
      preferences: newPlan.preferences as UserPreferences | Record<string, never>,
      plan: newPlan.plan as unknown as PlanStructure,
      archived: newPlan.archived,
      created_at: newPlan.created_at,
      updated_at: newPlan.updated_at,
    };
  },
};
