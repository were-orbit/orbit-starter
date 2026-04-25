# Frontends (TanStack Start vs. Next 16)

Orbit ships **two sibling implementations** of the authenticated web app,
living side-by-side in the monorepo:

| App | Framework | Port | Entry |
|---|---|---|---|
| `apps/web-tanstack` | TanStack Start + Vite | `4001` | `src/routes/` |
| `apps/web-next` | Next 16 App Router | `4003` | `app/` |

Both apps hit the **same** Hono API (`apps/api`, port `4002`), share the
**same** UI primitives (`@orbit/ui`), the **same** DTOs (`@orbit/shared`),
and log in with the **same** magic link. The `create-orb` CLI prompts
for one framework at scaffold time; the other folder is deleted by the
strip engine.

## Why two, instead of a shared core?

When we looked at a shared `app-core` + thin framework shells, the
abstraction only helped the kit **maintainer** (write a page once, render
it twice). The consumer — a developer who picked their framework and
deleted the other — would have to reason through our router-abstraction
layer forever. That's the wrong trade for a starter kit.

So we picked **two full sibling apps, no shared app-core, no platform
adapter**. Rules of the split:

1. **Shared** (`packages/*`) — only truly framework-agnostic code:
   - `@orbit/shared` — DTOs, Zod schemas, permission constants, branded IDs.
   - `@orbit/ui` — dumb coss-ui primitives, `cn()`, Tailwind theme, fonts.
   No router, no data fetching, no auth client lives in `packages/`.
2. **Duplicated** per framework:
   - Page components, layouts, nav, workspace switcher, onboarding.
   - `authClient` setup (a ~10-line `better-auth/react` call).
   - React Query provider, query-key factories, mutations.
   - Realtime / WebSocket client + Zustand-style entity stores.
   - Router config (TanStack `createFileRoute` vs. Next `app/**/page.tsx`).
3. **Rule of thumb** — if it imports React, it lives in `apps/web-*`. If
   it's types / pure data / raw CSS / dumb UI, it lives in `packages/`.

The accepted cost: when the kit grows a new settings section, we write it
in both shells. Each page is ~50–150 lines of markup + React Query hooks;
the real logic (permission checks, validation, authorization) lives in
the API, and that's a single implementation.

## Picking one

- **Mainstream ecosystem / Vercel-first deploy** → `next`. App Router,
  `next/link`, `useRouter()`, Server Components available when you want
  them (see below for the v1 boundary). Works out of the box with the
  biggest Next-flavoured community.
- **Typed file-based routing + great DX** → `tanstack`. TanStack Router
  gives you typed params, typed search params, typed loaders, and an
  excellent devtools story. Vite dev is fast and the SSR model is
  straightforward.
- **Not sure yet** → `tanstack`. It's the default, it's what the
  maintainers use day-to-day, and the Next app was built to match its
  user-facing behaviour one-for-one.

## The v1 data-fetching boundary (important)

Both apps fetch **client-side via React Query**, including the Next app.
We do **not** fetch workspace data in Next Server Components for v1.

Why:

- The API owns the auth cookie on a separate origin (`apps/api` on 4002).
- Forwarding that cookie into RSCs requires extra plumbing (`cookies()`
  read + explicit header forwarding on every RSC `fetch`).
- The TanStack sibling also doesn't do server-only workspace reads at
  this layer — keeping parity between the two means less "oh the Next
  version is subtly different" friction when you pick one and move on.

If you pick Next and want SSR'd workspace data later, it's a per-route
upgrade: read the session cookie in an RSC, forward it to the API, feed
the result into `React Query`'s `hydrate()` on the client. We left the
door open, we just didn't step through it.

## Layout

```
apps/
  api/                 # Hono API (port 4002)                     — shared
  www/                 # Marketing (TanStack Start, port 4000)    — shared
  web-tanstack/        # TanStack Start + Vite (port 4001)        — one of…
    src/routes/        # createFileRoute(…) tree
    src/pages/         # per-route React components
    src/lib/           # authClient, query-client, stores
  web-next/            # Next 16 App Router (port 4003)           — …the other
    app/               # App Router tree (layouts + page.tsx)
    src/views/         # per-route React components
    src/lib/           # authClient, query-client, stores
    src/env.ts         # NEXT_PUBLIC_* → WWW_URL / API_URL / WS_URL
packages/
  shared/              # DTOs, schemas, permissions — shared by both
  ui/                  # coss-ui + Tailwind theme  — shared by both
  create-orb/        # CLI, resolves which app survives
```

### Why `src/views/` in the Next app (instead of `src/pages/`)?

Next treats a top-level `pages/` folder as the Pages Router, and refuses
to build when both `pages/` and `app/` exist at the same level. Renaming
our per-route component folder to `src/views/` avoids that collision
without any runtime cost. The TanStack sibling stays on `src/pages/`
because Vite has no such collision.

## How the CLI flips the switch

1. `create-orb` prompts (or takes `--framework=tanstack|next`).
2. The choice enables exactly one of `frontend-tanstack` / `frontend-next`
   in `features.json`.
3. The strip engine deletes the loser's `apps/web-*` folder.
4. The CLI repoints the root `package.json`'s `dev:web` script at the
   surviving package, and removes the now-dead `dev:web-tanstack` or
   `dev:web-next` shortcut.

So after a `--framework=next` scaffold, you'll see:

```bash
npm run dev:web       # runs @orbit/web-next on port 4003
npm run dev:api       # unchanged
```

…and `apps/web-tanstack/` simply isn't in the tree.

## Running both in dev (for kit maintainers only)

When you're hacking on the kit itself, you want both apps running against
the same API so parity is easy to verify:

```bash
npm run dev:api        # Hono API on 4002
npm run dev:web-tanstack  # TanStack shell on 4001
npm run dev:web-next      # Next shell on 4003
```

The API's CORS allowlist already includes both ports in `.env.example`.

## Adding a new page

1. Decide the route shape. Both apps follow the same URL convention.
2. In `apps/web-tanstack`, add a file under `src/routes/…` using
   `createFileRoute(…)`. Put the React body in `src/pages/…` and thread
   the component through the route config.
3. In `apps/web-next`, add `app/<segment>/page.tsx`. Put the React body
   in `src/views/…` and import it from `page.tsx`.
4. If the page uses new shared primitives, add them to `@orbit/ui` so
   both apps consume the same component.
5. If the page reads a new API endpoint, the `@orbit/shared` DTO update
   is a single change — both apps type-check against it.

If your page only makes sense behind a fenced feature (teams, billing,
waitlist…), surround the relevant imports + JSX with `// +feature:<name>`
/ `// -feature:<name>` in **both** apps. `features.json` already lists
the dual-app fenced regions for the built-in features; follow the same
pattern for your own.
