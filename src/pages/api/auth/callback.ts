import type { APIRoute } from "astro";

export const prerender = false;

/**
 * GET /api/auth/callback
 * Handles OAuth callbacks and email confirmation links from Supabase
 *
 * This endpoint is called when:
 * - User clicks email confirmation link
 * - User clicks password reset link
 * - OAuth providers redirect back to app
 *
 * The Supabase SSR client automatically handles the code exchange
 * via the middleware, so we just need to redirect appropriately.
 *
 * @returns 302 Redirect to dashboard on success
 * @returns 302 Redirect to login with error on failure
 */
export const GET: APIRoute = async ({ url, redirect }) => {
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // If there's an error from Supabase, redirect to login with error
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    return redirect(`/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  // If there's no code, something went wrong
  if (!code) {
    return redirect("/login?error=no_code");
  }

  // The actual code exchange happens in middleware via Supabase SSR
  // The middleware will set the session cookie automatically
  // We just redirect to dashboard
  return redirect("/");
};



