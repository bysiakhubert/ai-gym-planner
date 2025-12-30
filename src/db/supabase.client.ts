import type { AstroCookies } from "astro";
import {
  createServerClient,
  type CookieOptionsWithName,
} from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";

import type { Database } from "../db/database.types.ts";
import type { SupabaseClient as SupabaseClientGeneric } from "@supabase/supabase-js";

export type SupabaseClient = SupabaseClientGeneric<Database>;

export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Cookie options for Supabase authentication
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parse cookie header string into array of name-value pairs
 */
function parseCookieHeader(
  cookieHeader: string,
): { name: string; value: string }[] {
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
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options),
        );
      },
    },
  });

  return supabase;
};
