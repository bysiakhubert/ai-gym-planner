import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { CreateSessionRequestSchema, ListSessionsQueryParamsSchema } from "src/lib/schemas/sessions";
import {
  sessionService,
  ActiveSessionConflictError,
  PlanAccessDeniedError,
  WorkoutAlreadyCompletedError,
} from "src/lib/services/sessionService";
import { ZodError } from "zod";

export const prerender = false;

/**
 * GET /api/sessions
 * Lists training sessions for the authenticated user with filtering and pagination
 *
 * Query Parameters:
 * - plan_id: Filter by plan UUID (optional)
 * - date_from: Filter sessions started on or after this date (YYYY-MM-DD, optional)
 * - date_to: Filter sessions started on or before this date (YYYY-MM-DD, optional)
 * - completed: Filter by completion status (true/false, optional)
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - sort: Sort field ("started_at" | "created_at", default: "started_at")
 * - order: Sort direction ("asc" | "desc", default: "desc")
 *
 * @returns 200 OK with paginated list of session summaries
 * @returns 400 Bad Request for invalid query parameters
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async ({ request, locals }) => {
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

  // Parse query parameters from URL
  const url = new URL(request.url);
  const queryParams = {
    plan_id: url.searchParams.get("plan_id") ?? undefined,
    date_from: url.searchParams.get("date_from") ?? undefined,
    date_to: url.searchParams.get("date_to") ?? undefined,
    completed: url.searchParams.get("completed") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  };

  // Validate query parameters with Zod schema
  try {
    const validatedParams = ListSessionsQueryParamsSchema.parse(queryParams);

    // Call SessionService to list sessions
    const paginatedSessions = await sessionService.list(supabase, userId, validatedParams);

    // Return 200 OK with paginated sessions
    return new Response(JSON.stringify(paginatedSessions), {
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
    console.error("Failed to list sessions:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while fetching sessions",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/sessions
 * Creates/starts a new training session
 *
 * Request Body:
 * - plan_id: UUID of the plan this session belongs to
 * - date: Session date in YYYY-MM-DD format
 * - session: SessionStructure object with workout data
 *
 * @returns 201 Created with the new session data
 * @returns 400 Bad Request for validation errors or plan access denied
 * @returns 409 Conflict if user already has an active session
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
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
    const validatedData = CreateSessionRequestSchema.parse(requestBody);

    // Call SessionService to create the session
    const newSession = await sessionService.create(supabase, userId, validatedData);

    // Return 201 Created with the new session
    return new Response(JSON.stringify(newSession), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof ZodError) {
      const errorResponse: ApiError = {
        error: "ValidationError",
        message: "Invalid session data",
        details: error.flatten().fieldErrors,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle active session conflict
    if (error instanceof ActiveSessionConflictError) {
      const errorResponse: ApiError = {
        error: "ConflictError",
        message: error.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle plan access denied
    if (error instanceof PlanAccessDeniedError) {
      const errorResponse: ApiError = {
        error: "ValidationError",
        message: error.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle workout already completed
    if (error instanceof WorkoutAlreadyCompletedError) {
      const errorResponse: ApiError = {
        error: "ValidationError",
        message: error.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Failed to create session:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while creating the session",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
