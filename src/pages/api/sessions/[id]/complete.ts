import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { SessionIdParamSchema, CompleteSessionRequestSchema } from "src/lib/schemas/sessions";
import { sessionService, SessionNotFoundError, SessionCompletedError } from "src/lib/services/sessionService";
import { DEFAULT_USER_ID } from "src/db/supabase.client";
import { ZodError } from "zod";

export const prerender = false;

/**
 * POST /api/sessions/:id/complete
 * Completes an in-progress training session
 *
 * Request Body (optional):
 * - session: SessionStructure object with final workout data (optional final update)
 *
 * @returns 200 OK with completed session details (SessionResponse)
 * @returns 400 Bad Request for invalid session ID, validation errors, or session already completed
 * @returns 404 Not Found if session doesn't exist or doesn't belong to user
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
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

  // Parse request body (optional)
  let requestBody = {};
  const contentType = request.headers.get("content-type");

  // Only parse body if content-type is JSON and body is not empty
  if (contentType?.includes("application/json")) {
    try {
      const text = await request.text();
      if (text.trim()) {
        requestBody = JSON.parse(text);
      }
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
  }

  // Validate request body with Zod schema
  try {
    const validatedData = CompleteSessionRequestSchema.parse(requestBody);

    // Call SessionService to complete the session
    const completedSession = await sessionService.complete(supabase, userId, sessionId, validatedData.session);

    // Return 200 OK with completed session
    return new Response(JSON.stringify(completedSession), {
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
    console.error("Failed to complete session:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while completing the session",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
