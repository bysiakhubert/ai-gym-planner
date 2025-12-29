import type { SupabaseClient } from "src/db/supabase.client";
import type {
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanResponse,
  UserPreferences,
  PlanStructure,
  PlanSummary,
  PaginatedPlansResponse,
  ListPlansQueryParams,
  ArchivePlanResponse,
  ContinuePlanRequest,
} from "src/types";
import type { Json } from "src/db/database.types";
import { auditLogService } from "./auditLogService";
import { sessionService } from "./sessionService";

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
 * Custom error class for plan not found
 */
export class PlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan with id "${planId}" not found`);
    this.name = "PlanNotFoundError";
  }
}

/**
 * Helper function to shift all dates in a plan structure by a given number of days
 *
 * @param planStructure - The original plan structure
 * @param daysOffset - Number of days to shift (positive for future, negative for past)
 * @returns A new plan structure with shifted dates
 */
function shiftPlanDates(planStructure: PlanStructure, daysOffset: number): PlanStructure {
  const newSchedule: Record<string, typeof planStructure.schedule[string]> = {};

  for (const [dateKey, workoutDay] of Object.entries(planStructure.schedule)) {
    // Parse the original date
    const originalDate = new Date(dateKey);
    
    // Add the offset in days
    const shiftedDate = new Date(originalDate);
    shiftedDate.setDate(shiftedDate.getDate() + daysOffset);
    
    // Format as YYYY-MM-DD
    const newDateKey = shiftedDate.toISOString().split('T')[0];
    
    // Deep copy the workout day to avoid mutation
    newSchedule[newDateKey] = {
      ...workoutDay,
      done: false, // Reset done status for new plan
      exercises: workoutDay.exercises.map(exercise => ({
        ...exercise,
        sets: exercise.sets.map(set => ({ ...set }))
      }))
    };
  }

  return {
    schedule: newSchedule
  };
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

  /**
   * Lists active (non-archived) plans for a user with pagination and sorting
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param params - Query parameters for pagination and sorting
   * @returns Paginated list of plan summaries
   * @throws {Error} If database operation fails
   */
  listPlans: async (
    supabase: SupabaseClient,
    userId: string,
    params: ListPlansQueryParams
  ): Promise<PaginatedPlansResponse> => {
    const { limit = 20, offset = 0, sort = "effective_from", order = "desc" } = params;

    // Step 1: Get total count of active plans for pagination
    const { count, error: countError } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("archived", false);

    if (countError) {
      throw new Error(`Failed to count plans: ${countError.message}`);
    }

    const total = count ?? 0;

    // Step 2: Fetch plans with only PlanSummary columns (excluding heavy JSONB fields)
    const { data: plans, error: fetchError } = await supabase
      .from("plans")
      .select("id, name, effective_from, effective_to, source, created_at, updated_at")
      .eq("user_id", userId)
      .eq("archived", false)
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch plans: ${fetchError.message}`);
    }

    // Step 3: Transform database results to PlanSummary type
    const planSummaries: PlanSummary[] = (plans ?? []).map((plan) => ({
      id: plan.id,
      name: plan.name,
      effective_from: plan.effective_from,
      effective_to: plan.effective_to,
      source: plan.source,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    }));

    // Step 4: Return paginated response
    return {
      plans: planSummaries,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + planSummaries.length < total,
      },
    };
  },

  /**
   * Gets a single plan by ID
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan to retrieve
   * @returns The plan if found, null otherwise
   * @throws {PlanNotFoundError} If the plan doesn't exist or doesn't belong to the user
   * @throws {Error} If database operation fails
   */
  getPlanById: async (supabase: SupabaseClient, userId: string, planId: string): Promise<PlanResponse> => {
    const { data: plan, error } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("user_id", userId)
      .single();

    // Handle Supabase single() error for no rows found (PGRST116)
    if (error) {
      if (error.code === "PGRST116") {
        throw new PlanNotFoundError(planId);
      }
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }

    if (!plan) {
      throw new PlanNotFoundError(planId);
    }

    // Transform database result to PlanResponse type
    return {
      id: plan.id,
      user_id: plan.user_id,
      name: plan.name,
      effective_from: plan.effective_from,
      effective_to: plan.effective_to,
      source: plan.source,
      prompt: plan.prompt,
      preferences: plan.preferences as UserPreferences | Record<string, never>,
      plan: plan.plan as unknown as PlanStructure,
      archived: plan.archived,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    };
  },

  /**
   * Archives a training plan (soft delete)
   *
   * Sets the archived flag to true instead of deleting the plan.
   * Also closes any active training sessions associated with this plan.
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan to archive
   * @returns Archive confirmation response
   * @throws {PlanNotFoundError} If the plan doesn't exist or doesn't belong to the user
   * @throws {Error} If database operation fails
   */
  archivePlan: async (supabase: SupabaseClient, userId: string, planId: string): Promise<ArchivePlanResponse> => {
    // Step 1: Check if plan exists and belongs to user
    const { data: existingPlan, error: checkError } = await supabase
      .from("plans")
      .select("id, name, archived")
      .eq("id", planId)
      .eq("user_id", userId)
      .single();

    if (checkError || !existingPlan) {
      throw new PlanNotFoundError(planId);
    }

    // Step 2: If already archived, return success
    if (existingPlan.archived) {
      return {
        message: "Plan already archived",
        id: planId,
      };
    }

    // Step 3: Close any active sessions for this plan
    try {
      const closedCount = await sessionService.closeSessionsForPlan(supabase, userId, planId);
      if (closedCount > 0) {
        // eslint-disable-next-line no-console
        console.info(`Closed ${closedCount} active session(s) for archived plan ${planId}`);
      }
    } catch (error) {
      // Log error but don't fail the archival
      // eslint-disable-next-line no-console
      console.error(`Failed to close sessions for plan ${planId}:`, error);
    }

    // Step 4: Update the plan to archived
    const { error: updateError } = await supabase
      .from("plans")
      .update({ archived: true })
      .eq("id", planId)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Failed to archive plan: ${updateError.message}`);
    }

    // Step 5: Log audit event
    await auditLogService.logEvent(supabase, userId, "plan_deleted", {
      entityType: "plan",
      entityId: planId,
      payload: {
        plan_name: existingPlan.name,
      },
    });

    // Step 6: Return success response
    return {
      message: "Plan archived successfully",
      id: planId,
    };
  },

  /**
   * Updates an existing training plan
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param planId - ID of the plan to update
   * @param data - Plan update data
   * @returns The updated plan
   * @throws {PlanNotFoundError} If the plan doesn't exist or doesn't belong to the user
   * @throws {DateOverlapError} If the new plan dates overlap with other existing plans
   * @throws {Error} If database operation fails
   */
  updatePlan: async (
    supabase: SupabaseClient,
    userId: string,
    planId: string,
    data: UpdatePlanRequest
  ): Promise<PlanResponse> => {
    // Step 1: Check if plan exists and belongs to user
    const { data: existingPlan, error: checkError } = await supabase
      .from("plans")
      .select("id, name")
      .eq("id", planId)
      .eq("user_id", userId)
      .single();

    if (checkError || !existingPlan) {
      throw new PlanNotFoundError(planId);
    }

    // Step 2: Check for date overlaps with other non-archived plans (excluding current plan)
    const { data: overlappingPlans, error: overlapError } = await supabase
      .from("plans")
      .select("id, name, effective_from, effective_to")
      .eq("user_id", userId)
      .eq("archived", false)
      .neq("id", planId)
      .or(`and(effective_from.lte.${data.effective_to},effective_to.gte.${data.effective_from})`);

    if (overlapError) {
      throw new Error(`Failed to check for overlapping plans: ${overlapError.message}`);
    }

    if (overlappingPlans && overlappingPlans.length > 0) {
      const overlappingPlan = overlappingPlans[0];
      throw new DateOverlapError(
        `Plan dates overlap with existing plan "${overlappingPlan.name}" (${overlappingPlan.effective_from} to ${overlappingPlan.effective_to})`
      );
    }

    // Step 3: Create the plan update object
    const planUpdate = {
      name: data.name,
      effective_from: data.effective_from,
      effective_to: data.effective_to,
      source: data.source,
      prompt: data.prompt ?? null,
      preferences: data.preferences as unknown as Json,
      plan: data.plan as unknown as Json,
    };

    // Step 4: Update the plan in the database
    const { data: updatedPlan, error: updateError } = await supabase
      .from("plans")
      .update(planUpdate)
      .eq("id", planId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update plan: ${updateError.message}`);
    }

    if (!updatedPlan) {
      throw new Error("Plan was not returned after update");
    }

    // Step 5: Log audit event
    await auditLogService.logEvent(supabase, userId, "plan_updated", {
      entityType: "plan",
      entityId: updatedPlan.id,
      payload: {
        plan_name: updatedPlan.name,
        effective_from: updatedPlan.effective_from,
        effective_to: updatedPlan.effective_to,
      },
    });

    // Step 6: Return the updated plan as PlanResponse
    return {
      id: updatedPlan.id,
      user_id: updatedPlan.user_id,
      name: updatedPlan.name,
      effective_from: updatedPlan.effective_from,
      effective_to: updatedPlan.effective_to,
      source: updatedPlan.source,
      prompt: updatedPlan.prompt,
      preferences: updatedPlan.preferences as UserPreferences | Record<string, never>,
      plan: updatedPlan.plan as unknown as PlanStructure,
      archived: updatedPlan.archived,
      created_at: updatedPlan.created_at,
      updated_at: updatedPlan.updated_at,
    };
  },

  /**
   * Continues/duplicates an existing plan with shifted dates
   *
   * Creates a new plan based on an existing one, shifting all workout dates
   * to start from a new effective_from date while preserving the workout structure
   * and rest day intervals.
   *
   * @param supabase - Supabase client instance
   * @param userId - ID of the user
   * @param sourcePlanId - ID of the plan to duplicate
   * @param data - Continue plan request data with new effective_from date and optional name
   * @returns The newly created plan with shifted dates
   * @throws {PlanNotFoundError} If the source plan doesn't exist or doesn't belong to the user
   * @throws {DateOverlapError} If the new plan dates overlap with existing non-archived plans
   * @throws {Error} If database operation fails
   */
  continuePlan: async (
    supabase: SupabaseClient,
    userId: string,
    sourcePlanId: string,
    data: ContinuePlanRequest
  ): Promise<PlanResponse> => {
    // Step 1: Fetch the source plan
    const sourcePlan = await planService.getPlanById(supabase, userId, sourcePlanId);

    // Step 2: Calculate the time delta in days
    const originalEffectiveFrom = new Date(sourcePlan.effective_from);
    const newEffectiveFrom = new Date(data.effective_from);
    const timeDeltaDays = Math.round(
      (newEffectiveFrom.getTime() - originalEffectiveFrom.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Step 3: Shift the plan dates
    const shiftedPlanStructure = shiftPlanDates(sourcePlan.plan, timeDeltaDays);

    // Step 4: Calculate new effective_to date
    const originalEffectiveTo = new Date(sourcePlan.effective_to);
    const newEffectiveTo = new Date(originalEffectiveTo);
    newEffectiveTo.setDate(newEffectiveTo.getDate() + timeDeltaDays);

    // Step 5: Generate new plan name if not provided
    const newPlanName = data.name ?? `Copy of ${sourcePlan.name}`;

    // Step 6: Create the new plan using createPlan method (includes overlap check and audit logging)
    const createPlanRequest: CreatePlanRequest = {
      name: newPlanName,
      effective_from: newEffectiveFrom.toISOString(),
      effective_to: newEffectiveTo.toISOString(),
      source: sourcePlan.source,
      prompt: sourcePlan.prompt,
      preferences: sourcePlan.preferences,
      plan: shiftedPlanStructure,
    };

    return await planService.createPlan(supabase, userId, createPlanRequest);
  },
};
