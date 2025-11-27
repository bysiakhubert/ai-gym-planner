import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { planService, PlanNotFoundError } from "src/lib/services/planService";
import { DEFAULT_USER_ID } from "src/db/supabase.client";
import { z } from "zod";

export const prerender = false;

/**
 * Schema for validating plan ID parameter
 */
const PlanIdSchema = z.string().uuid("Invalid plan ID format");

/**
 * DELETE /api/plans/:id
 * Archives (soft deletes) a training plan
 *
 * @returns 200 OK with archive confirmation
 * @returns 400 Bad Request for invalid plan ID format
 * @returns 404 Not Found if plan doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error for unexpected errors
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const { supabase } = locals;

  // TODO: Replace DEFAULT_USER_ID with authenticated user from locals.user after auth implementation
  const userId = DEFAULT_USER_ID;

  // Validate plan ID
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

  try {
    // Call PlanService to archive the plan
    const result = await planService.archivePlan(supabase, userId, planId);

    // Return 200 OK with archive confirmation
    return new Response(JSON.stringify(result), {
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

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to archive plan:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while archiving the plan",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

