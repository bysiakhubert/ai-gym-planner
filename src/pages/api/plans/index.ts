import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { CreatePlanRequestSchema, ListPlansQueryParamsSchema } from "src/lib/schemas/plans";
import { planService, DateOverlapError } from "src/lib/services/planService";
import { ZodError } from "zod";

export const prerender = false;

/**
 * GET /api/plans
 * Lists active (non-archived) training plans for the authenticated user
 *
 * Query Parameters:
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - sort: Sort field ("effective_from" | "created_at" | "name", default: "effective_from")
 * - order: Sort direction ("asc" | "desc", default: "desc")
 *
 * @returns 200 OK with paginated list of plan summaries
 * @returns 400 Bad Request for invalid query parameters
 * @returns 401 Unauthorized if user is not authenticated
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;

  // User should always be authenticated at this point due to middleware
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

  // Parse query parameters from URL
  const url = new URL(request.url);
  const queryParams = {
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  };

  // Validate query parameters with Zod schema
  try {
    const validatedParams = ListPlansQueryParamsSchema.parse(queryParams);

    // Call PlanService to list plans
    const paginatedPlans = await planService.listPlans(supabase, userId, validatedParams);

    // Return 200 OK with paginated plans
    return new Response(JSON.stringify(paginatedPlans), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof ZodError) {
      const errorResponse: ApiError = {
        error: "ValidationError",
        message: "Invalid query parameters",
        details: error.flatten().fieldErrors,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to list plans:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while fetching plans",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/plans
 * Creates a new training plan (manual or AI-accepted)
 *
 * @returns 201 Created with the new plan data
 * @returns 400 Bad Request for validation errors or date overlaps
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;

  // User should always be authenticated at this point due to middleware
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
