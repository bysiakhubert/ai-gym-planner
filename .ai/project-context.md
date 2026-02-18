<!--
AI CONTEXT FILE - MAINTENANCE INSTRUCTIONS
1. LANGUAGE: English ONLY.
2. FORMAT: Strict Markdown. No emojis. No conversational fluff.
3. GOAL: Token efficiency. Use RELATIVE paths (from project root). Avoid "search" operations.
4. UPDATE POLICY: Merge new facts. Overwrite structure to match this format.
-->
# PROJECT CONTEXT

## Codebase Map (CRITICAL)
- Pages: `src/pages/`
- API endpoints: `src/pages/api/`
- React components: `src/components/`
- Shadcn/ui components: `src/components/ui/`
- Layouts: `src/layouts/`
- Middleware: `src/middleware/index.ts`
- Supabase client + types: `src/db/`
- Services + helpers: `src/lib/`
- Shared types (DTOs, entities): `src/types.ts`
- Static assets: `src/assets/`, `public/`
- Astro config: `astro.config.mjs`
- Cloudflare config: `wrangler.jsonc`
- Supabase migrations: `supabase/migrations/`

## Ignored Areas (TOKEN SAVER)
- `node_modules/`
- `dist/`
- `supabase/.temp/` - local CLI cache, excluded from git
- `playwright-report/`, `test-results/`
- `coverage/`

## Dependency Graph
- Pages -> Middleware (auth check) -> `src/db/supabase.client.ts`
- Pages -> Services (`src/lib/services/`)
- API routes -> Schemas (`src/lib/schemas/`) -> Services
- React components -> API routes (fetch)

## Key Interface Signatures
- `createSupabaseServerInstance(context: { headers: Headers; cookies: AstroCookies }): SupabaseClient` - `src/db/supabase.client.ts`
- `SupabaseClient` = `SupabaseClientGeneric<Database>` - `src/db/supabase.client.ts`
- Auth stored in `locals.supabase` and `locals.user` (set in middleware)

## Domain Rules
- Auth: Supabase SSR via `@supabase/ssr`, cookies-based, `getUser()` preferred over `getSession()`
- No Astro Sessions used - all session data is training sessions stored in Supabase DB
- Public paths defined in middleware: `/login`, `/register`, `/forgot-password` + `/api/auth/*`
- API routes return 401 JSON for unauthenticated requests; pages redirect to `/login`

## Tech Stack
- Astro 5 (SSR, `output: "server"`)
- React 19
- TypeScript 5
- Tailwind 4
- Shadcn/ui (Radix UI primitives)
- Supabase (auth + database)
- Zod (validation)
- Cloudflare Pages (hosting, adapter: `@astrojs/cloudflare`)

## Architecture
- SSR-first: all pages server-rendered, React used for interactive islands (`client:only`, `client:load`)
- Middleware handles auth globally
- Services in `src/lib/services/` encapsulate business logic
- Schemas in `src/lib/schemas/` handle request validation (Zod)

## Naming Conventions
- Services: `src/lib/services/{domain}Service.ts`
- Schemas: `src/lib/schemas/{domain}.ts`
- API routes follow REST: `src/pages/api/{domain}/index.ts`, `src/pages/api/{domain}/[id].ts`

## Testing
- Unit tests: Vitest (`src/test/`)
- E2E tests: Playwright (`e2e/`)
- Test config: `vitest.config.ts`, `playwright.config.ts`

## Deployment
- Platform: Cloudflare Pages
- GitHub integration (auto-deploy on push)
- Build command: `npm run build`
- Deploy command: `npx wrangler pages deploy ./dist`
- Output dir: `dist`
- Wrangler config: `wrangler.jsonc` (`nodejs_compat` flag required)
- Env vars (set in Cloudflare dashboard): `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`, `SITE_URL`
