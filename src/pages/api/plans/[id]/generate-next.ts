import type { APIRoute } from "astro";
import type { ApiError, GenerateNextCycleRequest } from "src/types";
import { z } from "zod";
import { planService, PlanNotFoundError } from "src/lib/services/planService";
import { sessionService } from "src/lib/services/sessionService";
import { AiPlannerService } from "src/lib/services/aiPlannerService";
import { auditLogService } from "src/lib/services/auditLogService";

export const prerender = false;

/**
 * Schema for validating plan ID parameter
 */
const PlanIdSchema = z.string().uuid("Invalid plan ID format");

/**
 * Schema for validating GenerateNextCycleRequest body
 * POST /api/plans/:id/generate-next
 */
const GenerateNextCycleRequestSchema = z.object({
  cycle_duration_weeks: z
    .number()
    .int("Cycle duration must be an integer")
    .min(1, "Cycle duration must be at least 1 week")
    .max(12, "Cycle duration cannot exceed 12 weeks"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

/**
 * POST /api/plans/:id/generate-next
 *
 * Generates a preview of the next training cycle based on performance history.
 * Analyzes completed sessions and suggests progressions (increased weights, volume, etc.)
 *
 * @returns 200 OK with GenerateNextCycleResponse
 * @returns 400 Bad Request for validation errors or no sessions found
 * @returns 401 Unauthorized if user is not logged in
 * @returns 404 Not Found if plan doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error for AI generation failures
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    const errorResponse: ApiError = {
      error: "Unauthorized",
      message: "Musisz być zalogowany, aby uzyskać dostęp do tego zasobu",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  // Step 1: Validate plan ID
  const planIdResult = PlanIdSchema.safeParse(params.id);

  if (!planIdResult.success) {
    const errorResponse: ApiError = {
      error: "ValidationError",
      message: "Invalid plan ID format",
      details: { errors: planIdResult.error.flatten().formErrors },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const planId = planIdResult.data;

  // Step 2: Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const errorResponse: ApiError = {
      error: "ValidationError",
      message: "Invalid JSON in request body",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validationResult = GenerateNextCycleRequestSchema.safeParse(body);

  if (!validationResult.success) {
    const errorResponse: ApiError = {
      error: "ValidationError",
      message: "Invalid request body",
      details: { errors: validationResult.error.flatten().fieldErrors },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requestData: GenerateNextCycleRequest = validationResult.data;

  try {
    // Step 3: Fetch the current plan
    const currentPlan = await planService.getPlanById(supabase, userId, planId);

    // Step 4: Fetch completed sessions for AI analysis (may be empty)
    // When no sessions exist, AI will generate a plan based on current structure and user notes
    const sessionHistory = await sessionService.getCompletedSessions(
      supabase,
      userId,
      planId,
      20 // Limit to last 20 sessions for performance
    );

    // Step 6: Log AI generation request
    await auditLogService.logEvent(supabase, userId, "ai_generation_requested", {
      entityType: "plan",
      entityId: planId,
      payload: {
        action: "generate_next_cycle",
        source_plan_id: planId,
        cycle_duration_weeks: requestData.cycle_duration_weeks,
        notes: requestData.notes,
        session_count: sessionHistory.length,
      },
    });

    // Step 7: Generate next cycle using AI service
    const aiPlannerService = new AiPlannerService();
    const generatedCycle = await aiPlannerService.generateNextCycle(
      currentPlan,
      sessionHistory,
      requestData.cycle_duration_weeks,
      requestData.notes
    );

    // Step 8: Log AI generation completed
    await auditLogService.logEvent(supabase, userId, "ai_generation_completed", {
      entityType: "plan",
      entityId: planId,
      payload: {
        action: "generate_next_cycle",
        source_plan_id: planId,
        generated_plan_name: generatedCycle.plan.name,
        progression_changes_count: generatedCycle.progression_summary.changes.length,
        generation_time_ms: generatedCycle.metadata.generation_time_ms,
      },
    });

    // Step 9: Return generated plan preview
    return new Response(JSON.stringify(generatedCycle), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle plan not found error
    if (error instanceof PlanNotFoundError) {
      const errorResponse: ApiError = {
        error: "NotFound",
        message: error.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log AI generation failure
    await auditLogService.logEvent(supabase, userId, "ai_generation_failed", {
      entityType: "plan",
      entityId: planId,
      payload: {
        action: "generate_next_cycle",
        source_plan_id: planId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to generate next cycle:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while generating the next training cycle",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
