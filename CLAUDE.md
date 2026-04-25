# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                     # All dev servers (api :4002, web :4001, www :4000) + webhook tunnel
npm run dev:api                 # API only
npm run dev:web                 # Web app (TanStack Start) only — alias of dev:web-tanstack
npm run dev:web-tanstack        # TanStack Start app explicitly (port 4001)
npm run dev:web-next            # Next.js App Router app (port 4003)
npm run dev:www                 # Marketing site only (port 4000)
npm run dev:platform            # Internal platform API (Polar webhooks + GitHub collab)
npm run build                   # Build all workspaces
npm run typecheck               # Type-check all workspaces
npm run lint                    # Lint all workspaces
npm run prisma:generate         # Regenerate Prisma client (also emits Drizzle schema mirror)
npm run prisma:migrate          # Create + apply migration (interactive)
npm run prisma:reset            # Wipe and re-migrate database
npm run drizzle:generate        # Regenerate Drizzle migrations from schema
npm run drizzle:migrate         # Apply Drizzle migrations
npm run drizzle:push            # Push Drizzle schema (dev shortcut)
npm run drizzle:studio          # Open Drizzle Studio
npm run build:starter           # Build the public free-tier starter (internal release script)

# Tests (API only, vitest + Testcontainers)
npm run test --workspace @orbit/api              # Unit tests
npm run test:watch --workspace @orbit/api        # Watch
npm run test:integration --workspace @orbit/api  # Integration tests against a real Postgres
```

## What this repo is

Orbit is an opinionated SaaS starter kit shipped as a **scaffolding CLI**
(`create-orb`). This monorepo is the canonical full-feature template;
when a user runs the CLI, it clones this repo (or the public free-tier
starter) and strips out the features they didn't pick.

Product primitives:

- **Workspaces** as the multi-tenant root
- **Teams** nested inside a workspace, with their own roles (paid feature)
- **PBAC** at two scopes (workspace + team), assigned via roles
- **Billing** via a provider port — Stripe, Polar, or Dodo (paid)
- **Auth** via better-auth (magic links, OAuth, password+verification)
- **Audit logs** via post-commit projector (paid)
- **Transactional email** via a Mailer port (Resend adapter, paid)
- **Uploads** via a FileStorage port (UploadThing adapter, paid)
- **Background jobs** via a JobQueue port (graphile-worker or QStash, paid)
- **Rate limiting** via a RateLimiter port (memory / Upstash / Unkey)
- **Realtime** events over WebSocket for live workspace state
- **Demo mode** — self-expiring sandbox workspace surfaced from the marketing site (paid)

There is no messaging / rooms / channels domain.

### Paid vs free tier

Paid features (`teams`, `billing` + each provider, `uploads`, `waitlist`,
`audit-log`, `email-resend`, `jobs` + each provider, `rate-limit` +
remote adapters, `orm-drizzle`, `demo`) are gated by which **repo** the
CLI clones — selecting any paid feature switches it to the private
template. The list of paid features is the source of truth at
`packages/create-orb/src/args.ts` (`PAID_FEATURES` set).

## Monorepo layout

### Apps

- **apps/api** — Hono REST API + WebSocket server (Node, tsx, port 4002)
- **apps/web-tanstack** — Authenticated app, TanStack Start + React 19 + Vite (port 4001)
- **apps/web-next** — Authenticated app, Next 16 App Router + React 19 (port 4003)
- **apps/www** — Marketing site, TanStack Start (port 4000)
- **apps/webhook-tunnel** — Dev-only smee.io → local API forwarder
- **apps/web** — empty placeholder, ignore

The two frontend apps are **mutually exclusive at scaffold time** — the
CLI keeps whichever the user picks via `--framework=tanstack|next` and
deletes the other. They share `@orbit/ui`, `@orbit/shared`, the auth
flow, and the WebSocket client; per-page code is intentionally
duplicated so each framework stays idiomatic.

### Packages

- **packages/shared** — Domain types, DTOs, permissions, branded IDs
- **packages/ui** — coss-ui components (55), Tailwind v4 + Base UI, internal
- **packages/create-orb** — The scaffolding CLI itself (published to npm)
- **packages/orbit-examples** — empty placeholder

### Internal

- **internal/platform** — Hono service that handles Polar purchase webhooks
  and grants GitHub collaborator access to the private template repo. Not
  shipped to customers; runs in production behind wereorbit.com.

## The create-orb CLI

`packages/create-orb/` is the scaffolding tool users run to start a
project. Invoked as `npm create orb@latest <name>`.

**Repo selection logic:** the CLI inspects the chosen feature set; if
**any** paid feature is selected, it clones the private repo
(`were-orbit/orbit`), otherwise the public starter
(`were-orbit/orbit-starter`). The private repo requires GitHub
collaborator access, which `internal/platform` grants after a Polar
purchase. A user without access sees a helpful error pointing to
`/pricing`.

**Key flags** (full list in `packages/create-orb/src/args.ts`):

```
--framework=tanstack|next
--orm-provider=prisma|drizzle
--billing=yes|no  --billing-provider=stripe|polar|dodo
--teams=yes|no
--uploads=yes|no
--waitlist=yes|no
--jobs=yes|no    --jobs-provider=graphile|qstash
--rate-limit=yes|no  --rate-limit-provider=memory|upstash|unkey
--from <url|path>   # override template source (local dev)
--ref <branch>      # override branch/tag/commit
--no-install  -y  -h  -v
```

### Features manifest & stripping

`features.json` at the repo root is the source of truth for which files
and code blocks belong to which feature. The strip engine:

1. **Deletes files/dirs** listed in the manifest for unselected features.
2. **Removes fenced code blocks** marked with `// +feature:<name>` …
   `// -feature:<name>` (also `/* */` and `{/* */}` variants for JSX).
3. **Scrubs env keys** declared in the manifest.

Fenced regions are walked at strip time, not pre-enumerated, so adding
a new fenced block in any source file is automatic. Mutually exclusive
sub-features (e.g. `frontend-tanstack` vs `frontend-next`,
`billing-stripe` vs `billing-polar` vs `billing-dodo`) are declared in
the manifest so only the picked one survives.

When editing this repo, **think about what fence a change belongs in**
— code added without a fence ships in every output, including the free
starter.

## API architecture

Layered DDD with one folder per bounded context:

```
src/{context}/
  domain/         # Entities, events, value objects, repository interfaces
  application/    # Service classes (use cases), projectors (event subscribers)
  infrastructure/ # Prisma + Drizzle repository implementations, provider adapters
```

### Bounded contexts

- `identity` — users, sessions, admin flag, bans
- `workspaces` — workspace aggregate, members, workspace roles, invites
- `teams` — nested teams + per-team roles (paid)
- `billing` — subscriptions, customers, webhook ingestion (paid)
- `audit` — audit log ledgers (paid)
- `waitlist` — pre-auth allowlist (paid)
- `uploads` — file storage coordination (paid)
- `demo` — self-expiring demo workspaces, marketing-site only (paid)

### Cross-cutting

- `kernel/` — `Clock`, `EventBus`, `UnitOfWork`, `BaseUnitOfWork`,
  `Result<T>`, `DomainError`, branded `Id<K>`, `RateLimiter` port
- `infrastructure/` — Prisma client, Prisma + Drizzle UoW implementations,
  Mailer port + adapters, FileStorage port + adapters
- `interfaces/http/` — controllers, routing, middleware
- `interfaces/ws/` — WebSocket handler
- `interfaces/jobs/` — job worker entrypoint
- `realtime/` — in-process pub/sub hub + presence tracker
- `composition.ts` — DI container; everything wires up here

### Unit of Work pattern

All writes go through `uow.run()`, reads through `uow.read()`. Domain
events are collected during the transaction and dispatched to the
EventBus **after** commit. Projectors handle side effects: realtime
broadcasts, mailer sends, audit log materialization, webhook
reconciliation.

```ts
await uow.run(async (tx) => {
  const team = await tx.teams.findById(teamId);
  team.rename("Design squad");
  await tx.teams.save(team);
  tx.events.add(new TeamRenamed(...));
});
```

`BaseUnitOfWork` (`kernel/base-uow.ts`) holds the shared logic for
event collection, post-commit dispatch, and projector iteration.
`PrismaUnitOfWork` and `DrizzleUnitOfWork` only implement transaction
management and repository wiring — the rest is inherited.

### ID system

Branded, prefixed UUIDv7 IDs via `@orbit/shared/ids`. Use
`newId("team")` to generate, `zPrefixedId("team")` for Zod validation
in controllers.

### PBAC model

Two scopes, same shape:

- `WorkspaceRole` ↔ `WorkspacePermission` — owner / admin / member as
  system roles, plus arbitrary custom roles.
- `TeamRole` ↔ `TeamPermission` — team-admin / team-member as system
  roles, plus custom. Nested inside a workspace.

`requirePermission("workspace.members.invite")` and
`requireTeamPermission("team.roles.manage")` middleware guard server
routes. On the client, `useCan()` / `useCanTeam(teamId, perm)` hooks
gate UI. Audit log permissions: `workspace.audit_log.view`,
`workspace.audit_log.export`, `team.audit_log.view`. The full
permission vocabulary is declared in
`packages/shared/src/permissions.ts`.

### Audit logs

Two ledgers:

- **`AppAuditEntry`** — global admin-only ledger (bans, impersonations).
- **`WorkspaceAuditEntry`** — tenant-scoped, with optional `teamId` for
  team-narrowed entries.

Entries are materialized by the `AuditProjector` listening to the
EventBus *after* the UoW commits. Services never write audit rows
directly — they publish domain events, and `mapEventToAudit()` in
`audit-event-mapper.ts` translates events into 0, 1, or 2 entries
(fan-out to both ledgers is possible). Metadata is sanitized (tokens
redacted, emails preserved). Reads use cursor pagination.

### Billing

`BillingProvider` is an interface in `src/billing/domain/` with three
production adapters in `src/billing/infrastructure/`:

- `stripe-billing-provider.ts` + `stripe-webhook-receiver.ts`
- `polar-billing-provider.ts` + `polar-webhook-receiver.ts` (Standard-Webhooks)
- `dodo-billing-provider.ts` + `dodo-webhook-receiver.ts` (Standard-Webhooks)
- `noop-billing-provider.ts` — used when `BILLING_PROVIDER` is unset;
  routes return a disabled-state response, no SDK constructed.

Webhooks arrive at `POST /v1/billing/webhooks/:provider`, are
signature-verified by the adapter, and handed to
`HandleBillingWebhookService` which translates provider events into
domain updates inside a UoW.

Provider choice is wired at scaffold time: the CLI's
`--billing-provider` flag picks one, and feature stripping deletes the
other adapters. Sub-features `billing-stripe` / `billing-polar` /
`billing-dodo` are mutually exclusive in `features.json`.

### Mailer port

`Mailer` (`infrastructure/mailer.ts`) — adapters: `ResendMailer` (paid),
`ConsoleMailer` (dev fallback). Methods cover magic link, invite,
change-email verification + notice, account deletion verification,
email verification (when password auth is on).

### Rate limiting

`RateLimiter` is a port in `src/kernel/rate-limiter.ts` with adapters
under `src/infrastructure/rate-limiters/`: `InMemoryRateLimiter`
(single-process, dev default), `UpstashRateLimiter` (Redis), and
`UnkeyRateLimiter` (pairs with API-key issuance). Selected via
`RATE_LIMIT_PROVIDER=noop|memory|upstash|unkey`. Remote adapters are
wrapped in a circuit breaker (fail-open). The in-memory adapter is NOT
for production — state is not shared across workers, and the API warns
at boot if it's used with `NODE_ENV=production`. The Hono middleware
at `src/interfaces/http/middleware/rate-limit.ts` guards auth +
waitlist routes with layered per-IP and per-email limits.

### Background jobs

`JobQueue` and `JobRuntime` are ports in `src/jobs/`. Adapters:
`GraphileJobQueue/Runtime` (Postgres-backed, runs in-process) and
`QStashJobQueue/Runtime` (HTTP-triggered, serverless-friendly).
Selected via `--jobs-provider` at scaffold. Jobs are dispatched from
projectors and from scheduled cron entries.

### File storage

`FileStorage` (`uploads/application/file-storage.ts`) — adapters:
`UploadthingFileStorage` (prod), `NoopFileStorage` (when feature off).
The adapter exposes `routeHandler()` mounted at `/v1/uploads` and a
`delete()` method.

### Auth

Built on better-auth. Magic links, OAuth (Google, Apple), and
email+password. Password sign-up requires email verification before the
account can sign in (closes the pre-account-takeover window). In dev,
magic link URLs are logged to console and available via
`GET /v1/dev/last-magic-link?email=<addr>`. There's also
`POST /v1/dev/make-admin` to self-promote in dev. The better-auth DB
adapter swaps with the ORM choice (`@better-auth/prisma-adapter` vs
`@better-auth/drizzle-adapter`).

## Database

PostgreSQL. The CLI picks one ORM at scaffold time; the unchosen one
is deleted entirely.

- **Prisma** (free, default). Schema at `apps/api/prisma/schema.prisma`.
  After editing, run `npm run prisma:migrate` to create+apply a
  migration. `npm run prisma:generate` refreshes the client AND emits
  the Drizzle schema mirror via a custom generator.
- **Drizzle** (paid, `--orm-provider=drizzle`). Schema mirror at
  `apps/api/src/db/drizzle/schema.ts` (auto-generated — don't hand-edit
  unless you've also dropped Prisma). Migrations via
  `npm run drizzle:generate` and `npm run drizzle:migrate` against
  `apps/api/drizzle/`.

The Prisma schema is the source of truth. Both adapters sit behind the
same domain-layer repository interfaces and share the
`BaseUnitOfWork` in `src/kernel/base-uow.ts`, so services and domain
code are ORM-agnostic. Each context has paired
`prisma-*.repository.ts` and `drizzle-*.repository.ts` files. See
`apps/www/src/pages/docs/integrations/orm.tsx` for the user-facing
tour.

## Frontend architecture

Settings-first SaaS dashboard, identical UX between TanStack Start and
Next.js variants:

- File-based routing — TanStack Router (`src/routes/`) or Next App
  Router (`src/app/`).
- Workspace root (`/d/$workspaceSlug`) redirects to
  `/d/$workspaceSlug/workspace/settings/general`.
- Settings sections: General, Appearance, Members, Roles, Teams (if
  enabled), Billing (if enabled), Audit Log (if enabled), Integrations.
- Data fetching: `@tanstack/react-query` (query keys in
  `src/lib/query-keys.ts`, api client in `src/lib/api/client.ts`).
- App state: `@tanstack/react-store` (`src/lib/stores/app-state.ts`).
- Realtime: WebSocket in `src/lib/db/realtime.ts` — events apply to
  entity stores in `src/lib/stores/workspace-stores.ts`.

## packages/ui (coss-ui)

55 components in `src/components/ui/` built on Base UI primitives
(`@base-ui/react`) — not shadcn-style copy-paste; this is a real
internal component library with a barrel export. Tailwind v4, Class
Variance Authority for variants, Geist + Inter via Fontsource.
Includes Orbit-branded extras (`orbit-avatar`, `auth-split-layout`,
`ambient-grain`, `particle-field`) and a theme provider + appearance
picker.

## Tests

Vitest in `apps/api/`. Integration tests use Testcontainers to spin up
real Postgres — run them with
`npm run test:integration --workspace @orbit/api`. Audit log mapping
has its own integration suite at
`apps/api/src/__tests__/audit.integration.test.ts`.

## Local development with Stripe webhooks

See `apps/webhook-tunnel/README.md`. Short version:

1. `SMEE_URL=https://smee.io/<id>` in `apps/api/.env`
2. Register that smee URL as a Stripe (or Polar/Dodo) webhook endpoint
3. `npm run dev` — the tunnel forwards POSTs to
   `http://localhost:4002/v1/billing/webhooks/<provider>`.

Override `SMEE_TARGET_PATH` if you're building against a different
provider adapter.
