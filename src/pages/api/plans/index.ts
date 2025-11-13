import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { CreatePlanRequestSchema } from "src/lib/schemas/plans";
import { planService, DateOverlapError } from "src/lib/services/planService";
import { DEFAULT_USER_ID } from "src/db/supabase.client";
import { ZodError } from "zod";

export const prerender = false;

/**
 * POST /api/plans
 * Creates a new training plan (manual or AI-accepted)
 *
 * @returns 201 Created with the new plan data
 * @returns 400 Bad Request for validation errors or date overlaps
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  // TODO: Replace DEFAULT_USER_ID with authenticated user from locals.user after auth implementation
  const userId = DEFAULT_USER_ID;

  // Parse request body
  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    const errorResponse: ApiError = {
      error: "ValidationError",
      message: "Invalid JSON body",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate request body with Zod schema
  try {
    const validatedData = CreatePlanRequestSchema.parse(requestBody);

    // Call PlanService to create the plan
    const newPlan = await planService.createPlan(supabase, userId, validatedData);

    // Return 201 Created with the new plan
    return new Response(JSON.stringify(newPlan), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof ZodError) {
      const errorResponse: ApiError = {
        error: "ValidationError",
        message: "Invalid plan data",
        details: error.flatten().fieldErrors,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle date overlap errors
    if (error instanceof DateOverlapError) {
      const errorResponse: ApiError = {
        error: "DateOverlapError",
        message: error.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to create plan:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while creating the plan",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
