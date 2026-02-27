import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "../db/database.types.ts";
import type { SupabaseClient as SupabaseClientGeneric } from "@supabase/supabase-js";

export type SupabaseClient = SupabaseClientGeneric<Database>;

export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Cookie options for Supabase authentication
 * Note: secure is set to false in development/test to work with http://localhost
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parse cookie header string into array of name-value pairs
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create Supabase server client for SSR
 * This should be used in middleware, API routes, and Astro pages
 *
 * IMPORTANT: Always use getAll/setAll for cookie management, never individual get/set/remove
 *
 * @param context - Astro request context with headers and cookies
 * @returns Supabase client instance configured for SSR
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variable");
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
