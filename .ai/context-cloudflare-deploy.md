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
- BLOCKED - "Cloning git repository" step failing in Cloudflare build (unknown cause, deferred)

## Working Set (CRITICAL)
- `astro.config.mjs` - adapter changed from @astrojs/node to @astrojs/cloudflare
- `wrangler.jsonc` - new file, Cloudflare Pages config
- `package.json` - added @astrojs/cloudflare dependency
- `package-lock.json` - updated
- `.gitignore` - added supabase/.temp/ exclusion

## Progress
- Replaced `@astrojs/node` adapter with `@astrojs/cloudflare`
- Set `sessionKVBindingName: false` in adapter config (app uses Supabase auth, not Astro Sessions)
- Created `wrangler.jsonc` with `nodejs_compat` flag and `pages_build_output_dir: ./dist`
- Added `supabase/.temp/` to `.gitignore`
- Removed `supabase/.temp/` files from git tracking via `git rm --cached`
- Local `npm run build` passes cleanly
- Cloudflare Pages dashboard configured:
  - Build command: `npm run build`
  - Deploy command: `npx wrangler pages deploy ./dist`
  - Path: `dist`
  - Deploy command field is required in the new Cloudflare UI

## Key Decisions
- `sessionKVBindingName: false` - confirmed via grep that no `Astro.session` is used anywhere; all "session" references are training sessions stored in Supabase
- `nodejs_compat` flag in wrangler.jsonc - required for Supabase SSR compatibility in Workers runtime
- `supabase/.temp/` excluded from git - contains sensitive data (pooler URL with project ref, service versions)

## Next Steps
- Investigate "Cloning git repository" failure in Cloudflare build
  - Check if repo is private and Cloudflare has correct GitHub permissions
  - Re-authorize GitHub integration in Cloudflare Pages if needed
  - Check if branch name in Cloudflare matches actual branch (master vs main)

## Open Questions
- Why does "Cloning git repository" fail? Possible causes:
  - GitHub integration token expired / needs re-authorization
  - Branch mismatch (master vs main)
  - Repo visibility or permissions issue
