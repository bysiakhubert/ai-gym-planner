import type { APIRoute } from "astro";
import { UserPreferencesSchema } from "src/lib/schemas/plans";
import { auditLogService } from "src/lib/services/auditLogService";
import { AiPlannerService } from "src/lib/services/aiPlannerService";
import {
  OpenRouterConfigurationError,
  OpenRouterNetworkError,
  OpenRouterAPIError,
  OpenRouterParseError,
} from "src/lib/services/openRouterService";
import type { ApiError } from "src/types";

export const prerender = false;

// In-memory store for rate limiting.
// In a production environment, you would use a persistent store like Redis.
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 10;

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

  // Rate limiting check
  const now = Date.now();
  const userTimestamps = requestTimestamps.get(userId) || [];
  const recentTimestamps = userTimestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return new Response(
      JSON.stringify({
        error: "RateLimitExceeded",
        message: "Too many AI generation requests. Please try again later.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  requestTimestamps.set(userId, [...recentTimestamps, now]);

  // Parse and validate request body
  let requestBody;
  try {
    requestBody = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "ValidationError",
        message: "Invalid JSON body",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const validationResult = UserPreferencesSchema.safeParse(requestBody.preferences);

  if (!validationResult.success) {
    // Format validation errors into user-friendly messages
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    const errorMessages: string[] = [];

    // Extract all field error messages
    for (const [, messages] of Object.entries(fieldErrors)) {
      if (messages && messages.length > 0) {
        errorMessages.push(...messages);
      }
    }

    // Create a user-friendly message
    const mainMessage =
      errorMessages.length > 0
        ? errorMessages.join(". ")
        : "Nieprawidłowe dane formularza. Sprawdź wszystkie pola i spróbuj ponownie.";

    return new Response(
      JSON.stringify({
        error: "ValidationError",
        message: mainMessage,
        details: validationResult.error.flatten(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const preferences = validationResult.data;

  try {
    // Log generation request
    await auditLogService.logEvent(supabase, userId, "ai_generation_requested", {
      payload: { preferences },
    });

    // Generate plan using AI
    const aiPlannerService = new AiPlannerService();
    const planPreview = await aiPlannerService.generatePlanPreview(preferences);

    // Log successful generation
    await auditLogService.logEvent(supabase, userId, "ai_generation_completed", {
      payload: {
        model: planPreview.metadata.model,
        generation_time_ms: planPreview.metadata.generation_time_ms,
      },
    });

    return new Response(JSON.stringify(planPreview), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle OpenRouter-specific errors with appropriate HTTP status codes
    if (error instanceof OpenRouterConfigurationError) {
      // Configuration error - 500 Internal Server Error
      // eslint-disable-next-line no-console
      console.error("OpenRouter configuration error:", error);
      await auditLogService.logEvent(supabase, userId, "ai_generation_failed", {
        payload: {
          error_type: "configuration",
          error: error.message,
        },
      });

      return new Response(
        JSON.stringify({
          error: "ServiceConfigurationError",
          message: "AI service is not properly configured. Please contact support.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof OpenRouterNetworkError) {
      // Network error - 503 Service Unavailable
      // eslint-disable-next-line no-console
      console.error("OpenRouter network error:", error);
      await auditLogService.logEvent(supabase, userId, "ai_generation_failed", {
        payload: {
          error_type: "network",
          error: error.message,
        },
      });

      return new Response(
        JSON.stringify({
          error: "ServiceUnavailable",
          message: "AI service is temporarily unavailable. Please try again later.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof OpenRouterAPIError) {
      // API error - map status code appropriately
      // eslint-disable-next-line no-console
      console.error("OpenRouter API error:", error);
      await auditLogService.logEvent(supabase, userId, "ai_generation_failed", {
        payload: {
          error_type: "api",
          status_code: error.statusCode,
          error: error.message,
        },
      });

      // Determine appropriate response based on API error status
      const isClientError = error.statusCode >= 400 && error.statusCode < 500;
      const statusCode = isClientError ? 400 : 503;

      return new Response(
        JSON.stringify({
          error: "AIGenerationFailed",
          message: isClientError
            ? "Invalid request to AI service. Please check your input and try again."
            : "AI service encountered an error. Please try again later.",
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof OpenRouterParseError) {
      // Parse error - 500 Internal Server Error (AI returned invalid data)
      // eslint-disable-next-line no-console
      console.error("OpenRouter parse error:", error);
      await auditLogService.logEvent(supabase, userId, "ai_generation_failed", {
        payload: {
          error_type: "parse",
          error: error.message,
        },
      });

      return new Response(
        JSON.stringify({
          error: "AIGenerationFailed",
          message: "AI service returned invalid data. Please try again.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Unknown error - 500 Internal Server Error
    // eslint-disable-next-line no-console
    console.error("Unexpected error during AI plan generation:", error);
    await auditLogService.logEvent(supabase, userId, "ai_generation_failed", {
      payload: {
        error_type: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return new Response(
      JSON.stringify({
        error: "InternalServerError",
        message: "An unexpected error occurred. Please try again later.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
