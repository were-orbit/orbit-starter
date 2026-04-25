# Demo Mode — Design

**Date:** 2026-04-24
**Status:** Approved, pre-implementation
**Feature flag:** `+feature:demo` (stripped by the CLI; never shipped to kit
consumers)

## Problem

The marketing site (`apps/www`) currently funnels visitors through two
buttons: **Sign in** and **Get access** (which lands on
`/request-access` in the web app). Neither lets a prospect actually
use the product. We want a low-friction **Try the demo** path: one
click, no form, drops the visitor into a working workspace so they can
poke at teams, members, invites, roles, and billing. The demo is
temporary — cleaned up on a 30-minute cadence.

## Non-goals

- Demo code is **not** shipped by the `create-orb` CLI. Every
  file and every cross-cutting edit is wrapped in
  `// +feature:demo ... // -feature:demo` so the generator's strip pass
  removes it cleanly. The demo lives only on the Orbit marketing
  deploy.
- No demo experience in `apps/web-next`. Target is `apps/web-tanstack`
  (the canonical web app per `CLAUDE.md`).
- No upgrade path from demo → real account. Demo users click "Sign up"
  and start over from `/login`.
- No persistence across demo sessions. Each "Try the demo" click is a
  fresh workspace.

## Decisions

| Decision                | Choice                                                  |
|-------------------------|---------------------------------------------------------|
| What the demo contains  | Pre-seeded workspace (2 teams, fake members, invites, custom role, fake billing subscription) |
| Session lifetime        | 2 hours fixed, stamped at creation                      |
| Expiry UX               | Persistent banner with countdown; on 401, redirect to `/demo-expired` |
| Abuse protection        | Per-IP in-memory rate limit (3/hour)                    |
| Session mechanism       | `better-auth` `ctx.internalAdapter.createSession(userId)` + cookie header from `getCookies(options).sessionToken` — same pattern used by better-auth's own test helpers |
| Cleanup cadence         | Cron job every 30 minutes, deletes where `demoExpiresAt < now()` |

## Architecture

### New bounded context

```
apps/api/src/demo/                            # all files fenced +feature:demo
  feature.ts                                  # services() + jobs() hooks
  application/
    start-demo.service.ts
    cleanup-demo.service.ts
    demo-rate-limiter.ts
  infrastructure/
    demo-session-minter.ts
    demo-seeder.ts
  jobs.ts
```

The context follows the same DDD layering as other contexts
(`identity`, `workspaces`, `teams`, `billing`) — services in
`application/`, adapters in `infrastructure/`.

### Fencing surface

Every demo touch point is fenced:

- `apps/api/src/composition.ts` — service spread + jobs registration
- `apps/api/src/interfaces/http/routes.ts` — controller mount
- `apps/api/src/interfaces/http/controllers/auth.controller.ts` —
  `isDemo` + `demoExpiresAt` fields on the `/v1/me` user DTO
- `apps/api/prisma/schema.prisma` — two columns on `User`, two on
  `Workspace`, plus their indexes
- `apps/www/src/components/site-header.tsx` —
  button swap
- `apps/www/src/pages/landing.tsx` — CTA swap
- `apps/www/src/lib/urls.ts` — new `API_URL` export
- `apps/web-tanstack/src/components/demo-banner.tsx` — new file
- `apps/web-tanstack/src/routes/d/$workspaceSlug.tsx` — banner mount
- `apps/web-tanstack/src/routes/demo-expired.tsx` — new file
- `apps/web-tanstack/src/lib/api/client.ts` — 401-on-demo redirect
  handler

### Cross-feature interactions inside the seeder

The seeder is per-feature-fenced internally so that stripping *any*
upstream feature (e.g. `teams`, `billing`) still leaves a compiling
seeder:

```ts
async seed(tx, workspace, ownerMember) {
  // always (base workspaces feature):
  await seedCustomRole(tx, workspace);
  await seedFakeMembers(tx, workspace);
  await seedPendingInvites(tx, workspace, ownerMember);


}
```

## Schema

```prisma
model User {
  // ... existing fields ...

}

model Workspace {
  // ... existing fields ...

}
```

**Why both tables carry the flag:** `User.isDemo` is the source of
truth for "is this session a demo" (read by the banner and the
`/v1/me` DTO). `Workspace.isDemo` lets the cleanup job delete
workspaces without joining through members, and defensively protects
against demo-vs-real data cross-contamination.

**Cascade chain** (relies on existing FKs, already in schema):

- Deleting a demo `Workspace` cascades:
  `WorkspaceMember`, `WorkspaceInvite`, `WorkspaceRole`,
  `WorkspaceRolePermission`, `Team`, `TeamMember`, `BillingCustomer`,
  `BillingSubscription`.
- `Workspace.ownerId` is `onDelete: Restrict`, so cleanup deletes
  workspaces **before** users.
- Deleting a demo `User` cascades `Session`, `Account`.

Migration: single `prisma migrate dev --name add_demo_flags`. No
backfill (columns default to `false` / `null`).

## API surface

### `POST /v1/demo/start`

Controller at `apps/api/src/interfaces/http/controllers/demo.controller.ts`.
No request body, no query params.

Flow:

1. If `config.demo.enabled === false`, return 404.
2. Read client IP via `getClientIp(c)` (prefer first entry of
   `x-forwarded-for`, fallback `x-real-ip`, then `"unknown"`).
3. `if (!rateLimiter.tryConsume(ip)) return 429 { error: { code: "rate_limited" } }`.
4. `const { user, workspace } = await services.startDemo.execute()`.
5. `const setCookie = await services.startDemo.mintSessionCookie(user.id)`.
6. Set `Set-Cookie: <setCookie>` header on the response.
7. `return c.redirect(`${config.webOrigin}/d/${workspace.slug}?demo=1`, 303)`.

### `StartDemoService.execute()`

1. Generate `userId = newId("user")`, `demoEmail = \`demo-${userId}@demo.orbit.local\``, `workspaceSlug = "demo-" + shortRand()`, `expiresAt = clock.now() + 2h`.
2. Inside `uow.run`:
   - `tx.prisma.user.create({ data: { id: userId, email, name: "Demo User", emailVerified: true, isDemo: true, demoExpiresAt: expiresAt } })`.
     Bypasses better-auth's `databaseHooks.user.create.before` — which
     is correct; demo users are not signups and must skip the waitlist
     gate.
   - `await createWorkspace.execute({ ownerUserId: userId, name: "Demo Co", slug })`.
     Reuses the sanctioned path — gets the workspace, owner member, 3
     system roles for free.
   - `tx.prisma.workspace.update({ where: { id }, data: { isDemo: true, demoExpiresAt: expiresAt } })`.
   - `await demoSeeder.seed(tx, workspace, ownerMember)`.
3. Return `{ user, workspace }`.

**Events:** the underlying `CreateWorkspaceService` already emits
events (workspace opened, roles seeded, owner joined) — those are
fine, they fire for real workspaces too. The seeder itself emits
**no** events: it writes raw via repositories without calling
`pullEvents()` or `tx.events.addMany(...)`, so neither the realtime
publisher, the mailer, nor any webhook reconciler reacts to seeded
rows.

### `mintSessionCookie(userId)`

In `apps/api/src/demo/infrastructure/demo-session-minter.ts`:

```ts
import { getCookies, setCookieToHeader } from "better-auth/cookies";

export class DemoSessionMinter {
  constructor(private readonly auth: ReturnType<typeof buildBetterAuth>) {}

  async mint(userId: string): Promise<string> {
    const ctx = await this.auth.$context;
    const { token } = await ctx.internalAdapter.createSession(userId, false);
    const { sessionToken } = getCookies(this.auth.options);
    return setCookieToHeader(sessionToken.name, token, sessionToken.attributes);
  }
}
```

**Surface stability check (2026-04-24, `better-auth@1.6.5`):**
`auth.$context` is publicly typed at
`better-auth/dist/types/auth.d.mts`;
`ctx.internalAdapter.createSession(userId, dontRememberMe, override?, overrideAll?)`
is what better-auth's own `plugins/test-utils/auth-helpers.mjs` uses
for programmatic session creation. `getCookies` and
`setCookieToHeader` are named exports from `better-auth/cookies`.

### `/v1/me` DTO extension

Inside `+feature:demo`, add two fields to the `user` object returned
from `auth.controller.ts`:

```ts
{
  // ... existing fields ...
  isDemo: user.isDemo,
  demoExpiresAt: user.demoExpiresAt?.toISOString() ?? null,
}
```

## Seeder — "standard" profile

Executed inside the `StartDemoService` UoW.

| Block                  | Rows                                                                 | Fenced under           |
|------------------------|----------------------------------------------------------------------|------------------------|
| Custom workspace role  | 1 `WorkspaceRole` named `"Designer"` with permissions `workspace.members.invite`, `workspace.members.list` | base                   |
| Fake members           | 3 `WorkspaceMember` rows (Ada / Grace / Alan) on the MEMBER role      | base                   |
| Pending invites        | 2 `WorkspaceInvite` rows (`new-hire-1@demo.orbit.local`, `new-hire-2@demo.orbit.local`), no role assigned | base                   |
| Teams                  | 2 `Team` rows ("Design", "Platform"), each with the owner as team admin + one fake member | `+feature:teams`       |
| Billing                | 1 `BillingCustomer` (`providerId: "demo_cus_fake"`, no `isDemo` column — identified purely via cascade from the demo `Workspace`), 1 `BillingSubscription` on the first plan key in `BILLING_PLANS_JSON` or hardcoded `"pro"` if unset | `+feature:billing`     |

**Fake members and the `WorkspaceMember.userId` FK:** if
`WorkspaceMember.userId` is non-nullable (verify at implementation
time), the seeder creates shell `User` rows for each fake member with
`isDemo=true`, `demoExpiresAt` matching the owner, and a synthetic
email. These shell users are caught by the `User.isDemo` cleanup pass.
If `userId` is nullable (orbit's `WorkspaceMember.join` accepts a
`seed` field for email-pre-invite scenarios), we use that and skip
shell-user creation.

The mailer is **not** called for seeded invites: the seeder writes
directly via `tx.workspaceInvites.save()` and skips
`CreateWorkspaceService`'s post-commit email dispatch path.

## Cleanup job

```ts
// apps/api/src/demo/jobs.ts (fenced)
declare global {
  namespace OrbitJobs {
    interface Jobs {
      "demo.cleanup": Record<string, never>;
    }
  }
}

export const demoCleanupJob = (services: DemoServices) =>
  defineJob({
    name: "demo.cleanup",
    schedule: "*/30 * * * *", // UTC, every 30 min
    handler: async () => { await services.cleanupDemo.execute(); },
  });
```

### `CleanupDemoService.execute()`

```ts
await uow.run(async (tx) => {
  const now = this.clock.now();
  const workspacesDeleted = await tx.prisma.workspace.deleteMany({
    where: { isDemo: true, demoExpiresAt: { lt: now } },
  });
  const usersDeleted = await tx.prisma.user.deleteMany({
    where: { isDemo: true, demoExpiresAt: { lt: now } },
  });
  this.log.info({
    workspacesDeleted: workspacesDeleted.count,
    usersDeleted: usersDeleted.count,
  }, "demo.cleanup ran");
});
```

**Order:** workspaces first, users second, because
`Workspace.ownerId` is `onDelete: Restrict`. No domain events emitted.

**Operational note:** when `JOBS_PROVIDER=noop`, the schedule is a
no-op. The Orbit marketing deploy sets `JOBS_PROVIDER=graphile`, so
cleanup runs in production. In dev, `npm run dev` already runs
graphile-worker via the API process, so cleanup fires locally too.

## Rate limiter

```ts
// apps/api/src/demo/application/demo-rate-limiter.ts
export class DemoRateLimiter {
  private readonly buckets = new Map<string, { count: number; windowStart: number }>();
  constructor(private readonly clock: Clock, private readonly perHour = 3) {}

  tryConsume(key: string): boolean {
    const now = this.clock.now().getTime();
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= 60 * 60_000) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (bucket.count >= this.perHour) return false;
    bucket.count++;
    return true;
  }
}
```

- Singleton on the container.
- Memory-resident; not persisted across API restarts. Worst case: up
  to 6 demos per IP per hour across a deploy boundary. Acceptable.
- No background GC — `Map` grows until restart. If this becomes a
  footprint concern, swap for a size-capped LRU.
- `"unknown"` IP is a shared bucket by design — anonymous traffic all
  competes for the same 3/hour budget.

## Frontend

### `apps/www`

**`site-header.tsx`:** replace the two-button cluster
(`Sign in` + `Get access`) with a single `Try the demo` form-submit
button inside a `+feature:demo` fence:

```tsx
```

**`landing.tsx`:** same swap for the hero `Get started` CTA.

**Why a form POST, not a link:** the 303 response carries `Set-Cookie`.
A GET link would not. A form POST across origins works because the
existing CORS middleware already trusts `wwwOrigin` for credentialed
requests (required today for the waitlist form).

**`lib/urls.ts`:** add `API_URL` export:

```ts
```

### `apps/web-tanstack`

**`DemoBanner` component** (`src/components/demo-banner.tsx`, new,
fenced): renders above the workspace shell when `user.isDemo`. Shows
`"Demo expires in 1h 42m"` — client-side countdown ticking off
`demoExpiresAt` — with a separate `Sign up` link button on the
right edge pointing to `/login`.

**Banner mount** in `src/routes/d/$workspaceSlug.tsx`, fenced. Sits
above the existing workspace layout children.

**Welcome toast:** a single one-shot toast is triggered when
`?demo=1` is present in the URL on first workspace load ("Welcome to
your demo workspace"). The query param is stripped client-side after
firing. Not load-bearing — stripping the fence removes it without
breakage.

**Expiry handling** (`src/lib/api/client.ts`, fenced): intercept
401 responses. If the last-cached `/v1/me` response had
`user.isDemo === true`, navigate to `/demo-expired` instead of the
default re-auth flow.

**`/demo-expired` route** (`src/routes/demo-expired.tsx`, new, fenced):
static page — "Your demo ended" headline, two CTAs: `Sign up for real`
(→ `/login`) and `Start a new demo` (→ `${WWW_URL}` or directly to the
POST endpoint).

**`/v1/me` caller:** no code change — the client already types the
response shape from a shared DTO; the new fields flow through once
the API adds them.

No changes to `apps/web-next`.

## Configuration

New env var: `DEMO_ENABLED=true|false` (default `false`). Read by
`readConfig()` into `config.demo.enabled`, gate at the controller.
Stripped along with the rest of the code by the CLI — this flag only
exists in the Orbit marketing deploy's shipped kit.

No changes to existing env vars. CORS middleware unchanged (already
trusts `wwwOrigin`).

## Testing

Vitest, `apps/api` only. No new test scaffolding needed — follow the
existing service-test pattern.

**`start-demo.service.test.ts`:**
- Creates a demo: asserts `User.isDemo=true`, `demoExpiresAt≈now+2h`,
  workspace flags match, OWNER member exists, custom role "Designer"
  present, 3 fake members, 2 invites, 2 teams (+feature:teams branch),
  billing rows (+feature:billing branch).
- Asserts `FakeEventBus` saw the workspace-creation events from
  `CreateWorkspaceService` but none from the seeder.

**`cleanup-demo.service.test.ts`:**
- Seeds: one expired demo workspace + owner, one not-expired demo, one
  non-demo workspace. Advances `FakeClock` past expiry of the first.
- After `execute()`: only the expired demo is deleted; non-demo and
  future-expiry demos untouched. Orphaned demo shell users (fake
  members) are gone.

**`demo-rate-limiter.test.ts`:**
- Three hits pass, fourth returns false. After `FakeClock` advances
  past one hour, a new hit passes.

**`demo-session-minter.test.ts` (integration):**
- Boots a real `buildBetterAuth(...)` + Prisma test DB, creates a demo
  user, calls `mint(user.id)`, replays the returned cookie against
  `GET /v1/me`, asserts the response shape matches and
  `user.isDemo === true`.
- This is the single highest-risk piece (relies on better-auth
  internals), so it gets an integration test rather than a mock.

**Deferred:** full HTTP-level E2E of `POST /v1/demo/start` →
redirect → `/v1/me`. Add when an HTTP harness exists; not in the
first cut.

**Frontend:** no tests — www is a static swap, banner is trivial.

## Risks and open questions

1. **`WorkspaceMember.userId` nullability** — verify at implementation
   time. If non-nullable, seeder creates shell `User` rows for fake
   members (caught by `User.isDemo` cleanup). If nullable via the
   `seed` field already in `WorkspaceMember.join`, skip shell users.
2. **IP extraction behind production CDN/proxy** — `getClientIp` reads
   `x-forwarded-for`. If the Orbit marketing deploy doesn't sit behind
   a trustable proxy, the rate limit effectively degrades to the
   shared `"unknown"` bucket. Document this; tighten if it becomes a
   problem.
3. **better-auth upgrade** — the `$context.internalAdapter` surface is
   stable across 1.x per the type export, but a major version bump
   could shift it. Mitigation: the minter is a one-file adapter; if
   it breaks, so does the integration test in CI, and the fix is
   localized.
4. **Fake billing subscription rendering** — the billing UI reads plan
   metadata from `BILLING_PLANS_JSON`. If that env is empty, the
   hardcoded `"pro"` plan key won't resolve to a human-readable name.
   Acceptable for the first cut; document the expectation that the
   Orbit marketing deploy sets `BILLING_PLANS_JSON` to a non-empty
   catalog.

## Out of scope

- Demo → real account migration.
- Demo on `apps/web-next`.
- Persistent rate limiting (Redis / DB-backed).
- CAPTCHA / Turnstile.
- Analytics / conversion tracking on demo sessions.
