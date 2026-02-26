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
- IN PROGRESS - Root cause identified and fix applied, awaiting redeploy verification

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
- `[object Object]` root cause found: `nodejs_compat` causes Astro to misidentify Workers as Node.js, returning AsyncIterable response bodies instead of ReadableStream (GitHub issue #14511)
- Fix applied: added `disable_nodejs_process_v2` compatibility flag to `wrangler.jsonc`

## Key Decisions
- `sessionKVBindingName: false` - no `Astro.session` used anywhere
- `nodejs_compat` flag - required for Supabase SSR in Workers runtime
- `disable_nodejs_process_v2` flag - workaround for AsyncIterable/[object Object] bug (GitHub #14511)
- `supabase/.temp/` excluded from git
- Env vars use `astro:env/server` virtual module (declared in `astro.config.mjs` with `optional: true` and defaults)
- `SUPABASE_URL`/`SUPABASE_KEY`: `context: "server", access: "secret"`
- `SITE_URL`: `context: "server", access: "public"`

## Next Steps
- Push fix and verify deploy renders HTML correctly
- Alternative: if `disable_nodejs_process_v2` causes side effects, replace with `fetch_iterable_type_support` flag or bump `compatibility_date` to `>= 2026-02-19` (auto-enables the fix)

## Open Questions
- None currently - root cause resolved
