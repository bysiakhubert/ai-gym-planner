import type { Runtime } from "@astrojs/cloudflare";

type CloudflareLocals = Runtime & Record<string, unknown>;

interface ServerEnv {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  OPENROUTER_API_KEY?: string;
  SITE_URL?: string;
}

/**
 * Reads server env vars from Cloudflare runtime context (production)
 * with fallback to import.meta.env (local dev).
 *
 * Throws if required vars (SUPABASE_URL, SUPABASE_KEY) are missing.
 */
export function getServerEnv(locals: App.Locals): ServerEnv {
  const cf = (locals as CloudflareLocals).runtime?.env;

  const supabaseUrl = (cf?.SUPABASE_URL as string) || import.meta.env.SUPABASE_URL;
  const supabaseKey = (cf?.SUPABASE_KEY as string) || import.meta.env.SUPABASE_KEY;
  const openrouterApiKey = (cf?.OPENROUTER_API_KEY as string) || import.meta.env.OPENROUTER_API_KEY;
  const siteUrl = (cf?.SITE_URL as string) || import.meta.env.SITE_URL;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variable");
  }

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_KEY: supabaseKey,
    OPENROUTER_API_KEY: openrouterApiKey || undefined,
    SITE_URL: siteUrl || undefined,
  };
}
