import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

/**
 * Public paths that don't require authentication
 * Includes auth pages and auth API endpoints
 */
const PUBLIC_PATHS = [
  // Auth pages
  "/login",
  "/register",
  "/forgot-password",
  // Auth API endpoints
  "/api/auth/signin",
  "/api/auth/register",
  "/api/auth/signout",
  "/api/auth/callback",
  "/api/auth/reset-password",
];

/**
 * Check if a path is public (doesn't require authentication)
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => pathname === publicPath);
}

/**
 * Check if a path is an auth page (login, register, etc.)
 * These pages should redirect to dashboard if user is already logged in
 */
function isAuthPage(pathname: string): boolean {
  return ["/login", "/register", "/forgot-password"].includes(pathname);
}

/**
 * Authentication middleware
 *
 * This middleware:
 * 1. Creates Supabase SSR client for each request
 * 2. Verifies user session using getUser() (more secure than getSession())
 * 3. Protects routes - redirects unauthenticated users to /login
 * 4. Redirects authenticated users away from auth pages to /
 */
export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request, redirect }, next) => {
    // Create Supabase client with SSR cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Set supabase client in locals for use in routes
    locals.supabase = supabase;

    // IMPORTANT: Always get user session first before any other operations
    // Using getUser() instead of getSession() for better security
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Set user in locals if authenticated
    if (user) {
      locals.user = {
        id: user.id,
        email: user.email,
      };
    } else {
      locals.user = null;
    }

    const isPublic = isPublicPath(url.pathname);
    const isAuth = isAuthPage(url.pathname);
    const isApiRoute = url.pathname.startsWith("/api/");

    // If user is authenticated and tries to access auth pages (login, register)
    // redirect them to the dashboard
    if (user && isAuth) {
      return redirect("/");
    }

    // If user is not authenticated and tries to access protected routes
    if (!user && !isPublic) {
      // For API routes, return 401 JSON response instead of redirect
      if (isApiRoute) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Musisz być zalogowany, aby uzyskać dostęp do tego zasobu",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      
      // For page routes, redirect to login
      return redirect("/login");
    }

    return next();
  },
);
