import type { APIRoute } from "astro";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      supabaseUrl: SUPABASE_URL?.substring(0, 25) + "...",
      supabaseKeyPrefix: SUPABASE_KEY?.substring(0, 10) + "...",
      isPlaceholderUrl: SUPABASE_URL === "https://placeholder.supabase.co",
      isPlaceholderKey: SUPABASE_KEY === "placeholder-key",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
