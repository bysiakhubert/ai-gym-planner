import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { planService, PlanNotFoundError, DateOverlapError } from "src/lib/services/planService";
import { DEFAULT_USER_ID } from "src/db/supabase.client";
import { z } from "zod";
import { CreatePlanRequestSchema } from "src/lib/schemas/plans";

export const prerender = false;

/**
 * Schema for validating plan ID parameter
 */
const PlanIdSchema = z.string().uuid("Invalid plan ID format");

/**
 * GET /api/plans/:id
 * Retrieves full details of a specific training plan
 *
 * @returns 200 OK with plan details (PlanResponse)
 * @returns 400 Bad Request for invalid plan ID format
 * @returns 404 Not Found if plan doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async ({ params, locals }) => {
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
    // Call PlanService to get the plan by ID
    const plan = await planService.getPlanById(supabase, userId, planId);

    // Return 200 OK with plan details
    return new Response(JSON.stringify(plan), {
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
    console.error("Failed to fetch plan:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while fetching the plan",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

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

/**
 * PUT /api/plans/:id
 * Updates an existing training plan
 *
 * @returns 200 OK with updated plan details (PlanResponse)
 * @returns 400 Bad Request for invalid plan ID format or validation errors
 * @returns 404 Not Found if plan doesn't exist or doesn't belong to user
 * @returns 409 Conflict if plan dates overlap with existing plans
 * @returns 500 Internal Server Error for unexpected errors
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
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

  // Parse and validate request body
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

  // Validate request body using the same schema as create (full replacement)
  const validationResult = CreatePlanRequestSchema.safeParse(body);

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

  try {
    // Call PlanService to update the plan
    const updatedPlan = await planService.updatePlan(supabase, userId, planId, validationResult.data);

    // Return 200 OK with updated plan details
    return new Response(JSON.stringify(updatedPlan), {
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
    console.error("Failed to update plan:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while updating the plan",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

