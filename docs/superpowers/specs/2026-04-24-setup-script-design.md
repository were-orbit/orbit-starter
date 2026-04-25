# Setup Script + Quickstart Doc — Design

**Date:** 2026-04-24
**Status:** Approved, pre-implementation
**Scope:** A `npm run setup` command that walks the user through local
bootstrap in one shot (env files, postgres, migrations), plus a
"Quickstart" page at the top of the www docs getting-started section
that tells them exactly how to use it.

## Problem

Right now, getting a freshly-cloned Orbit repo running requires the
consumer to read four docs pages (Prerequisites, Running the CLI, Env
Variables, First Migration and Seed), hand-copy and hand-edit two
`.env.example` files, generate their own `BETTER_AUTH_SECRET`, and
remember to `prisma migrate deploy` before `npm run dev`. Anyone not
already familiar with the kit hits a few avoidable speed bumps. The
CLI-scaffolded repo should get someone to a running dashboard in
under five minutes.

## Non-goals

- Not a replacement for the `create-orb` CLI — the CLI picks
  providers (Stripe vs Polar, graphile vs qstash), the setup script
  just fills in credentials for whatever the CLI compiled in.
- Not a deploy pipeline. Setup is local only. Production deploy docs
  stay in `/docs/deploy/*`.
- No OAuth autocreate (Google / Apple consoles are external); the
  script just prompts for client id / secret if the user has them.
- No Stripe webhook endpoint autoconfig. User still points Stripe
  dashboard at the smee.io URL. The script prompts for `SMEE_URL` so
  it ends up in the env, nothing more.

## Decisions

| Decision                | Choice                                                                                           |
|-------------------------|--------------------------------------------------------------------------------------------------|
| Script language         | TypeScript via `tsx` (sibling to existing `scripts/build-starter.ts`)                           |
| Prompt library          | `@clack/prompts` — small, good TTY UX, MIT                                                       |
| Idempotency             | Re-runnable. Each step skips cleanly if already satisfied                                        |
| Provider selection      | Never asked — determined by the CLI scaffold. Script reads `.env.example` to know what's present |
| Secret auto-generation  | For vars named `*_SECRET`, `*_KEY`, `BETTER_AUTH_SECRET`, `WAITLIST_ADMIN_SECRET` — 32-byte hex   |
| Optional var handling   | Commented-out `# KEY=...` lines in `.env.example` are hidden by default behind a toggle          |
| Postgres bootstrap      | Detect reachability; if missing, offer `docker compose up -d` from the existing `docker-compose.yml` |
| Doc surface             | New `apps/www/src/pages/docs/getting-started/quickstart.tsx` + route; first item in nav          |
| Testing                 | Smoke only — no unit tests (script is I/O-heavy glue)                                            |

## Script flow

File: `scripts/setup.ts`. Runner: `"setup": "tsx scripts/setup.ts"`
added to root `package.json`.

Pipeline (each step is idempotent):

### 1. Tool check

- Read `process.versions.node`. Fail with a `>= 20.0.0` message if
  under.
- Check `tsx` is installed (it is, but confirm via package.json
  lookup).

### 2. Postgres detection

Priority order for the probe URL:
1. `DATABASE_URL` from `apps/api/.env` if it exists.
2. `DATABASE_URL` from `apps/api/.env.example`.
3. Hardcoded fallback `postgresql://postgres@127.0.0.1:5432/orbit`.

Try a lightweight `pg` connect. If it fails:

```
Postgres not reachable at <url>. What do you want to do?
  ▸ Start the bundled docker compose (docker compose up -d)
    Enter a different connection string
    Skip — I'll configure this later
```

If the docker path is chosen, `docker compose up -d postgres`, wait
up to 30s for reachability, re-try the probe. If docker fails (no
Docker daemon), fall through to "enter connection string".

### 3. Env sync

For each `.env.example` in the repo (`apps/api/.env.example`,
`apps/www/.env.example` if it exists, `apps/web-tanstack/.env.example`
if it exists):

1. If the sibling `.env` doesn't exist, copy `.env.example` verbatim.
2. Parse both with `dotenv` (keys only; `.env.example` provides the
   canonical variable list).
3. For each uncommented key in `.env.example`:
   - If `.env` has a non-empty value, skip.
   - Else prompt for a value. Help text = the inline comment lines
     immediately above the key in `.env.example`.
   - For auto-generateable keys (see table below), offer the generated
     value as a default and let the user accept with Enter.
   - For keys with a non-empty example value (e.g.
     `DATABASE_URL="postgresql://..."`), that example becomes the
     prompt's default.
4. For each commented key (`# KEY=...`), skip by default. A toggle
   (`"Show optional configuration? (y/N)"`) asked once at step start
   reveals them.
5. Write back to `.env` preserving the original line structure —
   don't emit comments twice, don't reorder.

**Auto-generate table** (name matching, case-sensitive):

| Key suffix / exact  | Generator                                      |
|---------------------|-----------------------------------------------|
| `*_SECRET`          | `crypto.randomBytes(32).toString("hex")`      |
| `*_SIGNING_KEY`     | `crypto.randomBytes(32).toString("hex")`      |
| `BETTER_AUTH_SECRET`| Same as above                                 |

### 4. Migrations

Run (in `apps/api`):

```bash
npx prisma migrate deploy
npx prisma generate
```

Stream output live. If `migrate deploy` fails, stop and print the
Prisma error + suggest `npx prisma migrate reset` as recovery. Don't
auto-reset (destructive).

### 5. Optional seed

Check for `apps/api/prisma/seed.ts` or an equivalent script hook.
If present:

```
Seed a demo workspace? (Y/n)
```

If yes, run the seed. If no, skip.

### 6. Summary

Print (in order, with real URLs from the env):

```
✓ Postgres:           postgresql://postgres@127.0.0.1:5432/orbit
✓ API:                http://localhost:4002
✓ Web (TanStack):     http://localhost:4001
✓ Web (Next):         http://localhost:4003
✓ Marketing:          http://localhost:4000

Run: npm run dev
```

No emojis in the actual implementation — the `✓` above is illustrative;
use ASCII `[ok]` prefixes in the real output to match the "no emoji"
project rule.

## Error handling

- **Any exception** → print `what failed`, the exact command that
  would let the user retry it, then exit non-zero.
- **User ctrl-C mid-prompt** → `clack` handles this; exit 0 with a
  "Setup paused. Re-run anytime with `npm run setup`." message.
- **Missing `apps/api/.env.example`** → fail with "CLI scaffold looks
  incomplete; regenerate with `npx create-orb`".

## Quickstart doc

File: `apps/www/src/pages/docs/getting-started/quickstart.tsx`.
Route: `apps/www/src/routes/docs.getting-started.quickstart.tsx`.
Nav: first item in the "Getting started" section in
`apps/www/src/components/docs-layout.tsx`, above `Prerequisites`.

Page structure (short — this is the TL;DR):

1. **Heading** — "Quickstart: ship in under 5 minutes"
2. **Prereqs line** — "Node 20+, Docker (or a running Postgres)"
3. **Three code blocks:**
   ```bash
   git clone … && cd orbit
   npm install && npm run setup
   npm run dev
   ```
4. **"What `npm run setup` does"** — 4-line bulleted summary.
5. **"Next" pointers** — links to Prerequisites (details), Env
   Variables (reference), Integrations (OAuth / Stripe / etc).

Existing getting-started pages stay as deeper reference.

## Testing

- **No unit tests.** Script is I/O + prompts glue.
- **Smoke test (manual):**
  1. `rm apps/api/.env apps/www/.env` (if present).
  2. `docker compose down -v && docker compose up -d postgres` for a clean DB.
  3. `npm run setup` → accept every default.
  4. `npm run dev` → all four servers boot, marketing site loads.
  5. Re-run `npm run setup` — it should detect everything's already
     configured and exit quickly ("all set — run `npm run dev`").
- **Documented in the spec** for future reviewers to run when the
  script is changed.

## Risks / open items

1. **`dotenv` writing back cleanly.** `dotenv` is a reader, not a
   writer. Implementation option: hand-roll a small line-oriented
   writer that preserves comments and key order (~30 lines). Or use
   `dotenv-flow` / `dotenv-expand`. I'd go with the hand-rolled writer
   — fewer deps, preserves the helpful inline comments in
   `.env.example`.
2. **`@clack/prompts` bundle size.** Tiny (~30kb), fine for a one-shot
   script.
3. **Docker detection.** `docker compose version` exits non-zero if
   docker isn't installed. Catch that cleanly and offer the
   "paste a URL" alternative.
4. **Windows compat.** The CLI is Mac/Linux-oriented today; Windows
   users on native PowerShell may hit `openssl`-style issues. Use
   `node:crypto` instead of shelling out — stays cross-platform.
5. **`apps/www/.env.example` may not exist yet.** Verify at
   implementation; if so, create one alongside the setup work so www
   env vars (VITE_WEB_URL, VITE_API_URL) are scripted too.

## Out of scope

- Production deploy automation (Fly, Vercel, Render).
- OAuth console walkthroughs (Google, Apple, GitHub).
- Stripe dashboard webhook-endpoint autoconfig.
- Multi-user onboarding (setup is for the repo owner, not end-users).
- Re-running parts of the pipeline individually (e.g. `npm run setup:env`).
  If it becomes useful, add later; YAGNI for v1.
