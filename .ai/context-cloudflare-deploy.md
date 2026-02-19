<!--
AI CONTEXT FILE - MAINTENANCE INSTRUCTIONS
1. LANGUAGE: English ONLY.
2. FORMAT: Strict Markdown. No emojis. No conversational fluff.
3. GOAL: Token efficiency. Use RELATIVE paths (from project root). Avoid "search" operations.
4. UPDATE POLICY: Merge new facts. Overwrite structure to match this format.
-->
# TASK CONTEXT: cloudflare-deploy

## Goal
- Deploy ai-gym-planner (Astro 5 SSR) to Cloudflare Pages via GitHub integration.

## Status
- BLOCKED - App deployed and accessible (200 OK) but renders `[object Object]` instead of HTML

## Working Set (CRITICAL)
- `astro.config.mjs` - adapter: `@astrojs/cloudflare`, `astro:env` schema defined
- `wrangler.jsonc` - `nodejs_compat` flag, `pages_build_output_dir: ./dist`
- `src/db/supabase.client.ts` - imports `SUPABASE_URL`, `SUPABASE_KEY` from `astro:env/server`
- `src/middleware/index.ts` - creates Supabase instance, auth protection
- `src/pages/login.astro` - uses `AuthLayout`, `LoginForm client:load`
- `src/layouts/AuthLayout.astro` - full HTML layout
- `package.json` - `@astrojs/cloudflare: ^12.6.12`

## Progress
- Replaced `@astrojs/node` adapter with `@astrojs/cloudflare`
- Set `sessionKVBindingName: false` (no Astro Sessions used)
- Created `wrangler.jsonc` with `nodejs_compat` flag
- Added `supabase/.temp/` to `.gitignore`, removed from git tracking
- Local `npm run build` passes cleanly
- Cloudflare Pages project created via dashboard (new flow, framework preset: Astro)
- Build command: `npm run build`, Deploy command: (handled by Pages), Build output: `dist`
- Env vars set in Cloudflare dashboard: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`, `SITE_URL`
- Deployment succeeds (build + deploy green)
- Cloudflare real-time logs show `200 Ok` for all requests - no errors logged
- BUT: browser shows only `[object Object]` as the entire page content

## Key Decisions
- `sessionKVBindingName: false` - no `Astro.session` used anywhere
- `nodejs_compat` flag - required for Supabase SSR in Workers runtime
- `supabase/.temp/` excluded from git
- Env vars use `astro:env/server` virtual module (declared in `astro.config.mjs` with `optional: true` and defaults)
- `SUPABASE_URL`/`SUPABASE_KEY`: `context: "server", access: "secret"`
- `SITE_URL`: `context: "server", access: "public"`

## Next Steps
- Investigate `[object Object]` root cause:
  - Check `view-source:https://ai-gym-planner.pages.dev/login` - confirm response body is literally `[object Object]`
  - Check Network tab in DevTools: Content-Type header of the response
  - Suspect: `astro:env/server` virtual module not resolving correctly in Cloudflare Workers runtime (env vars may not be injected at runtime)
  - Try replacing `import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server"` with `import.meta.env.SUPABASE_URL` / `import.meta.env.SUPABASE_KEY` in `src/db/supabase.client.ts` as a diagnostic step
  - Alternative: check if `dist/_worker.js` exists and is a valid Worker bundle

## Open Questions
- Why does `200 Ok` response contain `[object Object]` body?
  - Does `astro:env/server` work correctly with `@astrojs/cloudflare` v12?
  - Is the Cloudflare Worker runtime properly injecting env vars into the `astro:env/server` module?
  - Is there a Content-Type mismatch (response sent as non-HTML)?
