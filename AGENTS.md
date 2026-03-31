# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

**月老事務所：傳奇公會 V2.0** — a gamified social/dating PWA built with Next.js 14 (App Router), React 18, TypeScript, Supabase (cloud-hosted), and Tailwind CSS. The UI is entirely in Traditional Chinese.

### Services

| Service | How to run | Notes |
|---------|-----------|-------|
| Next.js dev server | `npm run dev` | Runs on `http://localhost:3000` |
| Supabase | Cloud-hosted (no local instance) | Requires env vars in `.env.local` |

### Commands

- **Lint**: `npm run lint` (ESLint via `next lint`)
- **Build**: `npm run build`
- **Dev**: `npm run dev`
- **No test framework** is configured (no Jest, Vitest, Playwright, or Cypress).

### Environment variables

The app requires three Supabase secrets in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Without valid Supabase credentials the dev server starts and renders pages (login, register, etc.), but all data/auth operations will fail at runtime. The `/api/ping` endpoint works without credentials and is useful for a quick health check.

### Gotchas

- Package manager is **npm** (`package-lock.json`). Do not use pnpm/yarn.
- Cloudinary credentials (cloud name, upload preset) are hardcoded in `src/lib/utils/cloudinary.ts`; no env vars needed for image upload.
- The middleware (`src/middleware.ts`) redirects unauthenticated users to `/login` for all protected routes. To view UI pages without auth, directly access `/login`, `/register`, or `/api/ping`.
- SQL migrations in `supabase/migrations/` are reference files for the cloud DB, not for local `supabase db push`.
