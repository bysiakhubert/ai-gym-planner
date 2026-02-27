import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const runtime = (locals as Record<string, unknown>).runtime;

  const hasRuntime = runtime !== undefined;
  const runtimeType = typeof runtime;
  const runtimeKeys = hasRuntime && runtime && typeof runtime === "object" ? Object.keys(runtime) : [];

  let envKeys: string[] = [];
  let envDiag: Record<string, string> = {};

  if (hasRuntime && runtime && typeof runtime === "object") {
    const env = (runtime as Record<string, unknown>).env;
    if (env && typeof env === "object") {
      envKeys = Object.keys(env);
      for (const key of ["SUPABASE_URL", "SUPABASE_KEY", "OPENROUTER_API_KEY", "SITE_URL"]) {
        const val = (env as Record<string, unknown>)[key];
        if (val === undefined) envDiag[key] = "undefined";
        else if (val === null) envDiag[key] = "null";
        else if (typeof val === "string") envDiag[key] = `string(${val.length}): ${val.substring(0, 8)}...`;
        else envDiag[key] = `${typeof val}`;
      }
    }
  }

  const importMetaKeys = ["SUPABASE_URL", "SUPABASE_KEY", "OPENROUTER_API_KEY", "SITE_URL"];
  const importMetaDiag: Record<string, string> = {};
  for (const key of importMetaKeys) {
    const val = (import.meta.env as Record<string, unknown>)[key];
    if (val === undefined) importMetaDiag[key] = "undefined";
    else if (typeof val === "string") importMetaDiag[key] = `string(${val.length}): ${val.substring(0, 8)}...`;
    else importMetaDiag[key] = `${typeof val}`;
  }

  return new Response(
    JSON.stringify(
      {
        hasRuntime,
        runtimeType,
        runtimeKeys,
        envKeys: envKeys.slice(0, 20),
        envDiag,
        importMetaDiag,
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json" } }
  );
};
