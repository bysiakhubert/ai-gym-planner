import type { APIRoute } from "astro";
import { registerSchema } from "@/lib/schemas/auth";
import type { ApiError } from "@/types";

export const prerender = false;

/**
 * POST /api/auth/register
 * Creates a new user account with email and password
 *
 * @body { email: string, password: string, confirmPassword: string }
 * @returns 201 Created with { success: true, message: string, requiresEmailConfirmation: boolean } on successful registration
 * @returns 400 Bad Request for validation errors
 * @returns 409 Conflict if user already exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

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

    // Attempt to create new user with Supabase Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      // eslint-disable-next-line no-console
      console.error("Registration error:", signUpError);

      // Map Supabase errors to user-friendly Polish messages
      let message = "Nie udało się utworzyć konta. Spróbuj ponownie";
      let status = 500;

      if (signUpError.message.includes("User already registered")) {
        message = "Użytkownik o takim emailu już istnieje";
        status = 409;
      } else if (signUpError.message.includes("Password")) {
        message = "Hasło nie spełnia wymagań bezpieczeństwa";
        status = 400;
      } else if (signUpError.message.includes("Email")) {
        message = "Nieprawidłowy adres email";
        status = 400;
      } else if (signUpError.message.includes("network")) {
        message = "Błąd połączenia. Spróbuj ponownie";
        status = 500;
      }

      const errorResponse: ApiError = {
        error: status === 409 ? "ConflictError" : "RegistrationError",
        message,
      };

      return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // IMPORTANT: Sign out immediately after registration
    // This ensures the user must log in manually and prevents auto-login
    // Supabase signUp creates a session automatically, but we want to enforce manual login
    await supabase.auth.signOut();

    // Successful registration - always redirect to login page
    // User must log in manually after registration
    return new Response(
      JSON.stringify({
        success: true,
        message: "Konto zostało utworzone pomyślnie! Teraz możesz się zalogować.",
        redirectTo: "/login",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Registration API error:", error);

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
