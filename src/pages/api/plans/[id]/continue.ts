import type { APIRoute } from "astro";
import type { ApiError, ContinuePlanRequest } from "src/types";
import { ContinuePlanRequestSchema } from "src/lib/schemas/plans";
import { planService, PlanNotFoundError, DateOverlapError } from "src/lib/services/planService";
import { z } from "zod";

export const prerender = false;

/**
 * Schema for validating plan ID parameter
 */
const PlanIdSchema = z.string().uuid("Invalid plan ID format");

/**
 * POST /api/plans/:id/continue
 *
 * Continues/duplicates an existing training plan with a new start date.
 * Creates a copy of the source plan with all workout dates shifted to maintain
 * the same relative schedule from the new effective_from date.
 *
 * This is useful for:
 * - Repeating a completed training cycle
 * - Starting a proven plan with a new timeline
 * - Creating a backup plan with adjusted dates
 *
 * @returns 201 Created with the new plan (PlanResponse)
 * @returns 400 Bad Request for validation errors or invalid date format
 * @returns 401 Unauthorized if user is not logged in (when auth is implemented)
 * @returns 404 Not Found if source plan doesn't exist or doesn't belong to user
 * @returns 409 Conflict if new plan dates overlap with existing plans
 * @returns 500 Internal Server Error for unexpected errors
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

  // Step 1: Validate plan ID parameter
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

  const sourcePlanId = planIdResult.data;

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

  const validationResult = ContinuePlanRequestSchema.safeParse(body);

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

  const requestData: ContinuePlanRequest = validationResult.data;

  // Step 3: Validate that effective_from is a valid date
  const effectiveFromDate = new Date(requestData.effective_from);
  if (isNaN(effectiveFromDate.getTime())) {
    const errorResponse: ApiError = {
      error: "ValidationError",
      message: "Invalid effective_from date",
      details: { effective_from: ["Must be a valid date in YYYY-MM-DD format"] },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Step 4: Call planService to continue/duplicate the plan
    const newPlan = await planService.continuePlan(supabase, userId, sourcePlanId, requestData);

    // Step 5: Return 201 Created with the new plan
    return new Response(JSON.stringify(newPlan), {
      status: 201,
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

    // Handle date overlap error
    if (error instanceof DateOverlapError) {
      const errorResponse: ApiError = {
        error: "DateOverlapError",
        message: error.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to continue plan:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while continuing the plan",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

