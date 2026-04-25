# @orbit/api

Hono + Node API server for the Orbit SaaS starter kit. Layered DDD
architecture with a Unit-of-Work seam between domain and infrastructure.

## Run

```sh
npm run dev --workspace @orbit/api
```

Server listens on **[http://localhost:4002](http://localhost:4002)** by
default (`PORT` and `API_ORIGIN` in `apps/api/.env`; keep them in sync
with `VITE_API_URL` in `apps/web-tanstack`).

## Bounded contexts

Each context lives under `src/<context>/` with the same internal shape:

```
identity/     — users, sessions, onboarding intent
workspaces/   — workspace row, members, roles, invites, PBAC
teams/        — nested teams + per-team roles (second PBAC scope)
billing/      — subscriptions, customers, provider port + Stripe adapter
waitlist/     — lead-capture for pre-launch
uploads/      — signed upload URLs via UploadThing
realtime/     — in-process pub/sub + presence tracker
```

Cross-cutting pieces live outside those contexts:

- `src/kernel/` — `Clock`, `EventBus`, `UnitOfWork`, `Result<T>`,
  `DomainError`, branded `Id<K>` types.
- `src/interfaces/http/` — controllers, routing, middleware.
- `src/interfaces/ws/` — WebSocket handler.
- `src/interfaces/jobs/` — graphile-worker scheduled jobs.
- `src/infrastructure/` — Prisma client, UoW implementation, mailer.
- `src/composition.ts` — dependency injection (all services built here).

## Unit of Work

All writes go through `uow.run()`, reads through `uow.read()`. Domain
events collected inside the transaction are dispatched to the
`EventBus` **after** commit. Projectors (event subscribers) handle side
effects like notifications, realtime broadcasts, and webhook reconciliation:

```ts
await uow.run(async (tx) => {
  const team = await tx.teams.findById(teamId);
  team.rename("Design squad");
  await tx.teams.save(team);
  tx.events.add(new TeamRenamed(...));
});
```

## Routes

All routes are prefixed `/v1`. The notable ones:

- `GET /health`, `GET /config` — public
- `POST /auth/*` — better-auth (magic links, OAuth)
- `GET /me` — session + workspace list
- `POST /onboarding/intent` — pre-workspace intent capture
- `POST /waitlist` — public lead capture
- `GET /workspaces/:slug` — snapshot with caller membership + roster
- `POST /workspaces` — create workspace
- `GET|POST|PATCH|DELETE /workspaces/:slug/teams/...`
- `GET|POST|PATCH|DELETE /workspaces/:slug/roles/...`
- `GET /workspaces/:slug/billing` — plans + subscription
- `POST /workspaces/:slug/billing/checkout` — provider redirect
- `POST /workspaces/:slug/billing/portal` — customer portal
- `POST /billing/webhooks/:provider` — signature-verified webhook sink

See `src/interfaces/http/router.ts` for the full list.
