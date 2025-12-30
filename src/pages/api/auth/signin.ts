import type { APIRoute } from "astro";
import { loginSchema } from "@/lib/schemas/auth";
import type { ApiError } from "@/types";

export const prerender = false;

/**
 * POST /api/auth/signin
 * Authenticates a user with email and password
 *
 * @body { email: string, password: string }
 * @returns 200 OK with { success: true, redirectTo: string } on successful login
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized for invalid credentials
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: ApiError = {
        error: "ValidationError",
        message: "Nieprawidłowe dane formularza",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, password } = validationResult.data;

    // Attempt to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log error for debugging (but don't expose details to client)
      // eslint-disable-next-line no-console
      console.error("Sign in error:", error);

      // Map Supabase errors to user-friendly Polish messages
      let message = "Nieprawidłowy email lub hasło";

      // Handle specific error cases with generic messages for security
      if (error.message.includes("Invalid login credentials")) {
        message = "Nieprawidłowy email lub hasło";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Potwierdź swój adres email przed zalogowaniem";
      } else if (error.message.includes("network")) {
        message = "Błąd połączenia. Spróbuj ponownie";
      }

      const errorResponse: ApiError = {
        error: "AuthenticationError",
        message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Successful login - cookies are automatically set by Supabase SSR
    return new Response(
      JSON.stringify({
        success: true,
        redirectTo: "/",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Sign in API error:", error);

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



