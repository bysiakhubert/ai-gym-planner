import type { APIRoute } from "astro";
import { UserPreferencesSchema } from "src/lib/schemas/plans";
import { auditLogService } from "src/lib/services/auditLogService";
import { AiPlannerService } from "src/lib/services/aiPlannerService";
import { DEFAULT_USER_ID } from "src/db/supabase.client";

export const prerender = false;

// In-memory store for rate limiting.
// In a production environment, you would use a persistent store like Redis.
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 10;

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;
  const userId = DEFAULT_USER_ID;

  // Rate limiting check
  const now = Date.now();
  const userTimestamps = requestTimestamps.get(userId) || [];
  const recentTimestamps = userTimestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
  }

  requestTimestamps.set(userId, [...recentTimestamps, now]);

  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const validationResult = UserPreferencesSchema.safeParse(requestBody.preferences);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: validationResult.error.flatten(),
      }),
      { status: 400 }
    );
  }

  const preferences = validationResult.data;

  try {
    await auditLogService.logEvent(supabase, userId, "ai_generation_requested", { preferences });

    const aiPlannerService = new AiPlannerService();
    const planPreview = await aiPlannerService.generatePlanPreview(preferences);

    await auditLogService.logEvent(supabase, userId, "ai_generation_completed", {
      model: planPreview.metadata.model,
    });

    return new Response(JSON.stringify(planPreview), { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("AI plan generation failed:", error);
    await auditLogService.logEvent(supabase, userId, "ai_generation_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};
