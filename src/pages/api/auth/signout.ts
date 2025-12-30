import type { APIRoute } from "astro";
import type { ApiError } from "@/types";

export const prerender = false;

/**
 * POST /api/auth/signout
 * Signs out the current user and clears session cookies
 *
 * @returns 200 OK with { success: true, redirectTo: string } on successful signout
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async ({ locals, redirect }) => {
  const { supabase } = locals;

  try {
    // Sign out from Supabase Auth
    // This will automatically clear the session cookies via SSR
    const { error } = await supabase.auth.signOut();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Sign out error:", error);

      const errorResponse: ApiError = {
        error: "SignOutError",
        message: "Nie udało się wylogować. Spróbuj ponownie",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Successful signout
    return new Response(
      JSON.stringify({
        success: true,
        redirectTo: "/login",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Sign out API error:", error);

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



