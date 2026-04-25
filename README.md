# Orbit Starter

> The **free tier** of [Orbit](https://wereorbit.com) — a SaaS starter kit.
> Auth, multi-tenant workspaces, permission-based access control, and realtime, in a clean DDD codebase. Pick TanStack Start or Next 16 as your frontend.

[![Get the paid tier](https://img.shields.io/badge/Upgrade-Paid%20tier-black?style=for-the-badge)](https://wereorbit.com/pricing)

---

## Quick start

**Prereqs:** Node 22+, npm 10+, PostgreSQL 14+.

```bash
npx create-orb my-saas     # scaffolds this starter into ./my-saas
cd my-saas
cp apps/api/.env.example apps/api/.env
# …fill in APP_SECRET, DATABASE_URL, AUTH_SECRET, etc.
npm run prisma:migrate
npm run dev
```

That's it. `api` is on `http://localhost:4002`, your web shell on `4001` (TanStack) or `4003` (Next), and the marketing site on `4000`.

No CLI? You can also clone this repo directly:

```bash
git clone https://github.com/were-orbit/orbit-starter.git my-saas
cd my-saas
npm install
cp apps/api/.env.example apps/api/.env
npm run prisma:migrate
npm run dev
```

---

## What's in the free tier

| Area | What ships |
|---|---|
| **Auth** | better-auth + magic link + OAuth (Google, Apple) + admin plugin |
| **Workspaces** | Multi-tenant root, slug URLs, invites, ownership transfer |
| **PBAC** | Workspace-scope permissions, system + custom roles, server-side checks, `useCan()` hook |
| **Realtime** | In-process WebSocket hub, presence tracker, heartbeat every 25s |
| **Frontend** | Your pick: TanStack Start (Vite) or Next.js 16 (App Router). React 19, Tailwind v4, `@orbit/ui` primitives |
| **DB** | Prisma 7 + PostgreSQL, branded UUIDv7 IDs, DDD bounded contexts, Unit of Work |
| **DX** | Turborepo, vitest, full TS, one `npm run dev` to start everything |

Enough to run a multi-tenant SaaS shell end-to-end. Sign-up, sign-in, create a workspace, invite collaborators, real-time state sync.

---

## What's in the paid tier

These features live in the [private](https://wereorbit.com/pricing) repo — scaffold them with the paid CLI once you've purchased access:

| Feature | What it adds |
|---|---|
| **Teams** | Second tier of grouping inside a workspace, with its own roles + PBAC scope. |
| **Billing** | `BillingProvider` port with **Stripe**, **Polar**, and **Dodo Payments** adapters. Checkout, customer portal, signed webhooks, event ledger. |
| **Background jobs + cron** | `JobQueue` / `JobRuntime` ports with **graphile-worker** (Postgres) and **Upstash QStash** (serverless HTTP) adapters. |
| **Rate limiting** | `RateLimiter` port with **Unkey** (default) and **Upstash Redis** adapters, layered per-IP + per-email middleware on the auth + waitlist surface. Fails open on provider outage. |
| **Audit logs** | Append-only trail at app + workspace scopes (narrowed to a team when teams is on). Entries materialised by a post-commit projector on the domain event bus, plus `workspace.audit_log.view` / `.export` permissions. |
| **Transactional email** | Resend adapter + React Email templates for magic links, invites, etc. (Free tier logs mail to stdout.) |
| **File uploads** | UploadThing wiring behind an `uploads` bounded context. |
| **Waitlist / private beta** | Request-access flow, admin approval, invite acceptance gate. |
| **Drizzle ORM** | Alternative to the default Prisma track. Same domain-layer repositories, a shared `BaseUnitOfWork`, and a generator that keeps the Drizzle schema in sync with the Prisma source of truth. |
| **Email + password auth** | Classic auth path, feature-flagged. |

### Upgrade → paid

```bash
# 1. Buy at https://wereorbit.com/pricing
# 2. We add your GitHub account to the private repo
# 3. Re-run the CLI with paid features — it clones from the private source:

npx create-orb my-saas \
  --framework=tanstack \
  --orm-provider=prisma \
  --billing-provider=stripe \
  --jobs-provider=graphile \
  --rate-limit-provider=unkey
```

Or, if you'd rather upgrade an existing project in place, see [the upgrade guide](https://wereorbit.com/docs/upgrade).

---

## Layout

```
.
├── apps/
│   ├── api             →  Hono REST + WebSocket server   (port 4002)
│   ├── web-tanstack    →  TanStack Start dashboard shell (port 4001)  ← pick one
│   ├── web-next        →  Next 16 App Router shell       (port 4003)  ← pick one
│   ├── www             →  Marketing site                 (port 4000)
│   └── webhook-tunnel  →  smee.io → local API forwarder  (dev only)
└── packages/
    ├── shared          →  domain types, DTOs, permissions, branded IDs
    └── ui              →  components, hooks, Tailwind v4 theme
```

Delete the frontend shell you don't want — scripts and imports are already pointed at both out of the box.

---

## Common scripts

```bash
npm run dev                 # everything at once
npm run dev:www             # marketing only           (4000)
npm run dev:web             # web shell                (whichever one survived)
npm run dev:api             # api only                 (4002)

npm run build               # build every app
npm run typecheck           # tsc -b across workspaces
npm run prisma:generate     # regenerate Prisma client
npm run prisma:migrate      # create + apply a migration
npm run prisma:reset        # wipe + re-migrate the dev DB
```

---

## Links

- **Website** — [wereorbit.com](https://wereorbit.com)
- **Docs** — [wereorbit.com/docs](https://wereorbit.com/docs)
- **Pricing** — [wereorbit.com/pricing](https://wereorbit.com/pricing)
- **Changelog** — [wereorbit.com/changelog](https://wereorbit.com/changelog)
- **Private repo (paid)** — access granted on purchase

---

## License

MIT. Do what you want with it.
