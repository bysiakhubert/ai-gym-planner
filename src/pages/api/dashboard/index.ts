import type { APIRoute } from "astro";
import type { ApiError } from "src/types";
import { DashboardService } from "src/lib/services/dashboard.service";

export const prerender = false;

/**
 * GET /api/dashboard
 * Returns dashboard summary with upcoming workouts and user state
 *
 * This is the main landing page for authenticated users.
 * Shows upcoming workouts and motivates users to start their training.
 *
 * @returns 200 OK with DashboardResponse
 * @returns 401 Unauthorized if user is not authenticated
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async ({ locals }) => {
  const { supabase, user } = locals;

  // User should always be authenticated at this point due to middleware
  // But we add a safety check just in case
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

  try {
    const dashboardService = new DashboardService(supabase, userId);
    const dashboardData = await dashboardService.getDashboardSummary();

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error with context for debugging
    // eslint-disable-next-line no-console
    console.error("Dashboard API error:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "Failed to retrieve dashboard data",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
