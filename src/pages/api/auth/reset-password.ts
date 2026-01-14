import type { APIRoute } from "astro";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import type { ApiError } from "@/types";
import { SITE_URL } from "astro:env/server";

export const prerender = false;

/**
 * POST /api/auth/reset-password
 * Sends a password reset email to the user
 *
 * @body { email: string }
 * @returns 200 OK with success message (always returns success for security)
 * @returns 400 Bad Request for validation errors
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ApiError = {
        error: "ValidationError",
        message: "Nieprawidłowy adres email",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email } = validationResult.data;

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/api/auth/callback`,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Reset password error:", error);

      // For security reasons, don't reveal if email exists
      // Always return success message
    }

    // Always return success for security (don't reveal if email exists)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeśli podany adres email istnieje w naszej bazie, otrzymasz link do resetowania hasła",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Reset password API error:", error);

    const errorResponse: ApiError = {
      error: "InternalServerError",
      message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
