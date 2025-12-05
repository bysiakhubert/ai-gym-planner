import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { SessionIdParamSchema, UpdateSessionRequestSchema } from "src/lib/schemas/sessions";
import { sessionService, SessionNotFoundError, SessionCompletedError } from "src/lib/services/sessionService";
import { DEFAULT_USER_ID } from "src/db/supabase.client";
import { ZodError } from "zod";

export const prerender = false;

/**
 * GET /api/sessions/:id
 * Retrieves full details of a specific training session
 *
 * @returns 200 OK with session details (SessionResponse)
 * @returns 400 Bad Request for invalid session ID format
 * @returns 404 Not Found if session doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const { supabase } = locals;

  // TODO: Replace DEFAULT_USER_ID with authenticated user from locals.user after auth implementation
  const userId = DEFAULT_USER_ID;

  // Validate session ID
  const idResult = SessionIdParamSchema.safeParse({ id: params.id });

  if (!idResult.success) {
    const errorResponse: ApiError = {
      error: "ValidationError",
      message: "Invalid session ID format",
      details: { errors: idResult.error.flatten().fieldErrors },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = idResult.data.id;

  try {
    // Call SessionService to get the session by ID
    const session = await sessionService.getById(supabase, userId, sessionId);

    // Return 200 OK with session details
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle session not found error
    if (error instanceof SessionNotFoundError) {
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
    console.error("Failed to fetch session:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while fetching the session",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/sessions/:id
 * Updates an in-progress training session
 *
 * Request Body:
 * - session: SessionStructure object with updated workout data
 *
 * @returns 200 OK with updated session details (SessionResponse)
 * @returns 400 Bad Request for invalid session ID, validation errors, or session already completed
 * @returns 404 Not Found if session doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error for unexpected errors
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { supabase } = locals;

  // TODO: Replace DEFAULT_USER_ID with authenticated user from locals.user after auth implementation
  const userId = DEFAULT_USER_ID;

  // Validate session ID
  const idResult = SessionIdParamSchema.safeParse({ id: params.id });

  if (!idResult.success) {
    const errorResponse: ApiError = {
      error: "ValidationError",
      message: "Invalid session ID format",
      details: { errors: idResult.error.flatten().fieldErrors },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = idResult.data.id;

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
    const validatedData = UpdateSessionRequestSchema.parse(requestBody);

    // Call SessionService to update the session
    const updatedSession = await sessionService.update(supabase, userId, sessionId, validatedData);

    // Return 200 OK with updated session
    return new Response(JSON.stringify(updatedSession), {
      status: 200,
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

    // Handle session not found error
    if (error instanceof SessionNotFoundError) {
      const errorResponse: ApiError = {
        error: "NotFound",
        message: error.message,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle session already completed error
    if (error instanceof SessionCompletedError) {
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
    console.error("Failed to update session:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while updating the session",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
