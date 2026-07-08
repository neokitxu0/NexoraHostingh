# NexoraHosting

A complete WHMCS-style web hosting billing and automation platform with client area, admin panel, billing, support tickets, domain management, affiliate program, and API tokens.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nexora run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed database with demo data
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind v4, shadcn/ui, TanStack Query, Wouter
- API: Express 5 at `/api`
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (localStorage `nexora_token`) + bcryptjs
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nexora/` — React + Vite frontend
- `artifacts/api-server/` — Express 5 backend
- `lib/db/` — Drizzle ORM schema + migrations
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/` — Generated React Query hooks
- `scripts/src/seed.ts` — Database seed script

## Architecture decisions

- Contract-first API: OpenAPI spec in `lib/api-spec` → Orval codegen → typed React Query hooks
- JWT stored in `localStorage` under `nexora_token`; refreshed on mount via `AuthProvider`
- Admin checks: route guards use `user.role === "admin" || "staff"`
- Dark mode forced via `document.documentElement.classList.add("dark")` in `main.tsx` (Tailwind v4 does not support `@apply dark`)
- All API calls go through shared proxy at `/api`; no direct port calls from frontend

## Product

- **Public site**: Home, Pricing (shared/VPS/dedicated/game), Knowledge Base
- **Auth**: Login, Register
- **Client Area**: Dashboard, Services (list/detail/order/cancel), Billing (invoices/transactions/credit), Support Tickets (list/new/detail/close), Domains (list/search), Profile, Security (password/API tokens), Notifications, Affiliate Program
- **Admin Panel**: Dashboard metrics, Customers (list/detail/edit), Products (CRUD), Services (suspend/unsuspend), Tickets, Invoices, Staff management, Audit Logs

## Demo Credentials

- Admin: Set via `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars (default fallback: `admin@nexorahosting.com` / `NexoraAdmin@2026!`)
- Demo client: `demo@example.com` / `demo123`

To set real admin credentials before going live:
1. Open Replit Secrets / Environment Variables
2. Set `ADMIN_EMAIL` = your real admin email
3. Set `ADMIN_PASSWORD` = a strong password
4. Run `pnpm --filter @workspace/scripts run seed` to create the admin account

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Tailwind v4: never use `@apply dark;` — add `.dark` class to `document.documentElement` via JavaScript instead
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before using generated hooks
- `@workspace/api-client-react` must be configured via `setBaseUrl()` and `setAuthTokenGetter()` in `main.tsx` before hooks work
- bcryptjs is not in the pnpm catalog — use an explicit version number in `scripts/package.json`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
