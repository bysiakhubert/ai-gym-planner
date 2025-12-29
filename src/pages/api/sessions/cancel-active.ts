import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { DEFAULT_USER_ID } from "src/db/supabase.client";

export const prerender = false;

/**
 * POST /api/sessions/cancel-active
 * Cancels the current active session by setting ended_at to current time
 * 
 * This is used when user wants to abandon an in-progress session
 * to start a new one.
 *
 * @returns 200 OK if session was cancelled
 * @returns 404 Not Found if no active session exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ locals }) => {
  const { supabase } = locals;
  const userId = DEFAULT_USER_ID;

  try {
    // Step 1: Find the active session
    const { data: activeSession, error: fetchError } = await supabase
      .from("training_sessions")
      .select("id, session")
      .eq("user_id", userId)
      .is("ended_at", null)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch active session: ${fetchError.message}`);
    }

    if (!activeSession) {
      const errorResponse: ApiError = {
        error: "NotFoundError",
        message: "No active session found",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Cancel the session by setting ended_at
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("training_sessions")
      .update({ ended_at: now })
      .eq("id", activeSession.id);

    if (updateError) {
      throw new Error(`Failed to cancel session: ${updateError.message}`);
    }

    // Step 3: Return success
    return new Response(
      JSON.stringify({
        message: "Session cancelled successfully",
        session_id: activeSession.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to cancel active session:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "An unexpected error occurred while cancelling the session",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

