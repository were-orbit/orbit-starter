# Setup Script + Quickstart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-command local bootstrap (`npm run setup`) that walks a fresh clone through Postgres, env files, migrations — paired with a Quickstart doc at the top of the www docs getting-started section.

**Architecture:** Thin pipeline in `scripts/setup.ts` composed from three pure utility modules (env parser, env writer, pg probe). Each utility is small and unit-tested; the pipeline is I/O glue. Provider selection is never asked — the CLI scaffold already baked in which billing/jobs providers compile, so the script only fills in credentials for whatever is present in `.env.example`.

**Tech Stack:** Node 20+, `tsx`, `@clack/prompts`, `pg`, `node:crypto`, Docker Compose (for optional Postgres bootstrap).

**Spec reference:** `docs/superpowers/specs/2026-04-24-setup-script-design.md`.

---

## Ground rules for the implementer

- **No emojis** in code, output, or commits (global CLAUDE.md).
- **No feature fences** on any of this work — it's unconditional repo tooling.
- **Commit after each task.** Lowercase imperative subjects.
- **Prefer small focused files.** Each utility ≤ ~80 lines; the pipeline composes them.
- **Identifier pins** (used across tasks):
  - Module: `scripts/lib/env-parser.ts` — exports `parseEnvFile(raw: string): EnvLine[]`, `readEnvFile(path): Promise<EnvLine[]>`.
  - Module: `scripts/lib/env-writer.ts` — exports `serializeEnvFile(lines: EnvLine[]): string`, `setEnvValue(lines, key, value): EnvLine[]`.
  - Types: `EnvLine = { kind: "blank" } | { kind: "comment"; text: string } | { kind: "var"; key: string; value: string; quoted: boolean; commentedOut: boolean }`.
  - Module: `scripts/lib/pg-probe.ts` — exports `probePostgres(url: string): Promise<{ ok: true } | { ok: false; error: string }>`.
  - Module: `scripts/lib/secret-gen.ts` — exports `generateSecret(bytes?: number): string`, `shouldAutoGenerate(key: string): boolean`.
  - Docker compose service name for Postgres (added in Task 1): `postgres`.
  - Docker compose profile name: `dev`.

## File Structure

### New files

| Path                                              | Purpose                                                    |
|---------------------------------------------------|------------------------------------------------------------|
| `scripts/lib/env-parser.ts`                       | Line-oriented `.env`/`.env.example` parser                 |
| `scripts/lib/env-parser.test.ts`                  | Unit tests                                                  |
| `scripts/lib/env-writer.ts`                       | Serialize + set-value operations on `EnvLine[]`            |
| `scripts/lib/env-writer.test.ts`                  | Unit tests                                                  |
| `scripts/lib/pg-probe.ts`                         | Lightweight Postgres reachability probe                    |
| `scripts/lib/secret-gen.ts`                       | Secret heuristics (which keys to auto-gen) + generator     |
| `scripts/lib/secret-gen.test.ts`                  | Unit tests                                                  |
| `scripts/setup.ts`                                | Interactive pipeline composed from the utilities           |
| `apps/www/src/pages/docs/getting-started/quickstart.tsx` | Quickstart doc content                              |
| `apps/www/src/routes/docs.getting-started.quickstart.tsx`| Route wrapper                                       |

### Modified files

| Path                                              | Edit                                                        |
|---------------------------------------------------|-------------------------------------------------------------|
| `package.json`                                    | Add `"setup"` script, add `@clack/prompts` + `pg` + `@types/pg` devDependencies |
| `docker-compose.yml`                              | Add `postgres` service under `dev` profile                  |
| `apps/www/src/components/docs-layout.tsx`         | Add Quickstart as first item in Getting started section     |
| `apps/www/.env.example`                           | Create if missing (content: `VITE_WEB_URL` + `VITE_API_URL`)|
| `apps/web-tanstack/.env.example`                  | Create if missing (content: `VITE_API_URL`)                 |

---

## Task 1: Add Postgres to docker-compose + deps

**Files:**
- Modify: `docker-compose.yml`
- Modify: `package.json`

The spec assumes `docker compose up -d postgres` works. `docker-compose.yml` currently has no Postgres service — add one under a `dev` profile so it doesn't start with the default compose up (which is for running app services). Also install the runtime deps the script needs.

- [ ] **Step 1: Add the Postgres service**

Open `docker-compose.yml`. Find the `services:` block. Add the following service entry at the top of the services list (before `api-migrate`):

```yaml
  # --- local dev database (opt-in) ---------------------------------------------
  # Not started by default — use `docker compose --profile dev up -d postgres`
  # or `npm run setup` (which handles this for you).
  postgres:
    profiles: ["dev"]
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: orbit
    ports:
      - "5432:5432"
    volumes:
      - orbit-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10
```

At the bottom of `docker-compose.yml`, add (or extend) a `volumes:` top-level block:

```yaml
volumes:
  orbit-postgres-data:
```

If a `volumes:` block already exists, append `orbit-postgres-data:` to it.

- [ ] **Step 2: Install deps**

Run from repo root:

```bash
npm install --save-dev @clack/prompts pg @types/pg
```

- [ ] **Step 3: Add the setup script to package.json**

Open `package.json`. In the `scripts` block, add after `build:starter`:

```json
    "setup": "tsx scripts/setup.ts"
```

The final `scripts` block should have `setup` as the last entry.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -5
```

Expected: passes.

- [ ] **Step 5: Sanity-check docker-compose**

```bash
docker compose config --services 2>&1 | head
```

Expected: lists `postgres`, `api-migrate`, `api`, `web`, `www`.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml package.json package-lock.json
git commit -m "chore: add dev postgres service and setup-script deps"
```

---

## Task 2: Env parser utility + tests

**Files:**
- Create: `scripts/lib/env-parser.ts`
- Create: `scripts/lib/env-parser.test.ts`

Line-oriented parser that preserves everything — comments, blanks, ordering, inline commented-out vars. The writer (Task 3) edits this structure and re-serializes.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/env-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnvFile } from "./env-parser.ts";

describe("parseEnvFile", () => {
  it("parses blank lines, comments, and vars", () => {
    const raw = `# header comment\n\nDATABASE_URL="postgres://x"\n# help for FOO\nFOO=bar\n`;
    const lines = parseEnvFile(raw);
    expect(lines).toEqual([
      { kind: "comment", text: "# header comment" },
      { kind: "blank" },
      {
        kind: "var",
        key: "DATABASE_URL",
        value: "postgres://x",
        quoted: true,
        commentedOut: false,
      },
      { kind: "comment", text: "# help for FOO" },
      {
        kind: "var",
        key: "FOO",
        value: "bar",
        quoted: false,
        commentedOut: false,
      },
    ]);
  });

  it("recognises a commented-out var (# KEY=value)", () => {
    const raw = `# OPTIONAL="leave blank in dev"\n`;
    const lines = parseEnvFile(raw);
    expect(lines).toEqual([
      {
        kind: "var",
        key: "OPTIONAL",
        value: "leave blank in dev",
        quoted: true,
        commentedOut: true,
      },
    ]);
  });

  it("ignores whitespace around keys and values", () => {
    const raw = `  KEY  =  value  \n`;
    const lines = parseEnvFile(raw);
    expect(lines).toEqual([
      {
        kind: "var",
        key: "KEY",
        value: "value",
        quoted: false,
        commentedOut: false,
      },
    ]);
  });

  it("keeps an empty value", () => {
    const raw = `EMPTY=\n`;
    expect(parseEnvFile(raw)).toEqual([
      {
        kind: "var",
        key: "EMPTY",
        value: "",
        quoted: false,
        commentedOut: false,
      },
    ]);
  });

  it("treats lines that aren't var-shaped as plain comments even without '#'", () => {
    const raw = `random words\n`;
    expect(parseEnvFile(raw)).toEqual([
      { kind: "comment", text: "random words" },
    ]);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd /Users/sean/personal/orbit && npx vitest run scripts/lib/env-parser.test.ts
```

Expected: fails (`./env-parser.ts` does not exist).

- [ ] **Step 3: Implement the parser**

Create `scripts/lib/env-parser.ts`:

```ts
import { readFile } from "node:fs/promises";

export type EnvLine =
  | { kind: "blank" }
  | { kind: "comment"; text: string }
  | {
      kind: "var";
      key: string;
      value: string;
      /** True if the raw line wrapped the value in single or double quotes. */
      quoted: boolean;
      /** True for `# KEY=value` lines — still parsed so the writer can uncomment. */
      commentedOut: boolean;
    };

const VAR_RE = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/;
const COMMENTED_VAR_RE = /^\s*#\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/;

function stripQuotes(raw: string): { value: string; quoted: boolean } {
  const trimmed = raw.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return { value: trimmed.slice(1, -1), quoted: true };
  }
  return { value: trimmed, quoted: false };
}

export function parseEnvFile(raw: string): EnvLine[] {
  const result: EnvLine[] = [];
  const lines = raw.split(/\r?\n/);
  // Trailing newline produces an empty final element — ignore.
  const effective = lines.length > 0 && lines.at(-1) === "" ? lines.slice(0, -1) : lines;

  for (const line of effective) {
    if (line.trim() === "") {
      result.push({ kind: "blank" });
      continue;
    }
    const commented = line.match(COMMENTED_VAR_RE);
    if (commented) {
      const { value, quoted } = stripQuotes(commented[2] ?? "");
      result.push({
        kind: "var",
        key: commented[1]!,
        value,
        quoted,
        commentedOut: true,
      });
      continue;
    }
    const uncommented = line.match(VAR_RE);
    if (uncommented) {
      const { value, quoted } = stripQuotes(uncommented[2] ?? "");
      result.push({
        kind: "var",
        key: uncommented[1]!,
        value,
        quoted,
        commentedOut: false,
      });
      continue;
    }
    result.push({ kind: "comment", text: line });
  }
  return result;
}

export async function readEnvFile(path: string): Promise<EnvLine[]> {
  const raw = await readFile(path, "utf8");
  return parseEnvFile(raw);
}
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
cd /Users/sean/personal/orbit && npx vitest run scripts/lib/env-parser.test.ts
```

Expected: 5/5 tests pass.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -5
```

Expected: 8/8 pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/env-parser.ts scripts/lib/env-parser.test.ts
git commit -m "feat(scripts): add env-file parser utility"
```

---

## Task 3: Env writer utility + tests

**Files:**
- Create: `scripts/lib/env-writer.ts`
- Create: `scripts/lib/env-writer.test.ts`

Two operations: serialize `EnvLine[]` back to a string, and set a value by key (creating the var if it doesn't exist, uncommenting if commented-out, updating if already uncommented).

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/env-writer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnvFile } from "./env-parser.ts";
import { serializeEnvFile, setEnvValue } from "./env-writer.ts";

describe("serializeEnvFile", () => {
  it("round-trips through parse + serialize", () => {
    const raw = `# top\n\nDATABASE_URL="postgres://x"\n# doc\nFOO=bar\n# OPT=\"y\"\n`;
    const lines = parseEnvFile(raw);
    expect(serializeEnvFile(lines)).toBe(raw);
  });

  it("preserves unquoted vars as unquoted", () => {
    const raw = `FOO=bar\n`;
    expect(serializeEnvFile(parseEnvFile(raw))).toBe(raw);
  });
});

describe("setEnvValue", () => {
  it("updates an existing uncommented value", () => {
    const lines = parseEnvFile(`FOO="old"\n`);
    const next = setEnvValue(lines, "FOO", "new");
    expect(serializeEnvFile(next)).toBe(`FOO="new"\n`);
  });

  it("uncomments and assigns a previously commented-out var", () => {
    const lines = parseEnvFile(`# FOO="example"\n`);
    const next = setEnvValue(lines, "FOO", "real");
    expect(serializeEnvFile(next)).toBe(`FOO="real"\n`);
  });

  it("appends the var when it isn't present at all", () => {
    const lines = parseEnvFile(`BAR=1\n`);
    const next = setEnvValue(lines, "NEW", "value");
    expect(serializeEnvFile(next)).toBe(`BAR=1\nNEW="value"\n`);
  });

  it("is idempotent — setting the same value twice is a no-op", () => {
    const lines = parseEnvFile(`FOO="x"\n`);
    const once = setEnvValue(lines, "FOO", "y");
    const twice = setEnvValue(once, "FOO", "y");
    expect(serializeEnvFile(twice)).toBe(`FOO="y"\n`);
  });

  it("preserves quoting style of the existing var", () => {
    const lines = parseEnvFile(`FOO=bar\n`);
    const next = setEnvValue(lines, "FOO", "baz");
    // Was unquoted, stays unquoted.
    expect(serializeEnvFile(next)).toBe(`FOO=baz\n`);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd /Users/sean/personal/orbit && npx vitest run scripts/lib/env-writer.test.ts
```

Expected: fails on unresolved import.

- [ ] **Step 3: Implement the writer**

Create `scripts/lib/env-writer.ts`:

```ts
import type { EnvLine } from "./env-parser.ts";

function formatVarLine(
  key: string,
  value: string,
  quoted: boolean,
  commentedOut: boolean,
): string {
  const prefix = commentedOut ? "# " : "";
  const body = quoted ? `${key}="${value}"` : `${key}=${value}`;
  return `${prefix}${body}`;
}

export function serializeEnvFile(lines: EnvLine[]): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line.kind === "blank") {
      out.push("");
    } else if (line.kind === "comment") {
      out.push(line.text);
    } else {
      out.push(
        formatVarLine(line.key, line.value, line.quoted, line.commentedOut),
      );
    }
  }
  // Match the convention of a trailing newline, which matches dotenv norms.
  return `${out.join("\n")}\n`;
}

/**
 * Set `key` to `value` in the given line structure:
 *   - If the key exists uncommented, overwrite its value.
 *   - If the key exists commented-out (`# KEY=...`), uncomment and overwrite.
 *   - Otherwise, append a new `KEY="value"` line at the end.
 *
 * Returns a new array — input is not mutated.
 */
export function setEnvValue(
  lines: EnvLine[],
  key: string,
  value: string,
): EnvLine[] {
  const idx = lines.findIndex(
    (l) => l.kind === "var" && l.key === key,
  );
  if (idx === -1) {
    return [
      ...lines,
      { kind: "var", key, value, quoted: true, commentedOut: false },
    ];
  }
  const existing = lines[idx] as Extract<EnvLine, { kind: "var" }>;
  const updated: EnvLine = {
    kind: "var",
    key,
    value,
    quoted: existing.quoted,
    commentedOut: false,
  };
  return [...lines.slice(0, idx), updated, ...lines.slice(idx + 1)];
}
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
cd /Users/sean/personal/orbit && npx vitest run scripts/lib/env-writer.test.ts
```

Expected: 6/6 pass.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -5
```

Expected: 8/8 pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/env-writer.ts scripts/lib/env-writer.test.ts
git commit -m "feat(scripts): add env-file writer utility"
```

---

## Task 4: Secret generation + key heuristics

**Files:**
- Create: `scripts/lib/secret-gen.ts`
- Create: `scripts/lib/secret-gen.test.ts`

Decide which env keys to auto-generate (`*_SECRET`, `*_SIGNING_KEY`, `BETTER_AUTH_SECRET`) and produce hex secrets.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/secret-gen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateSecret, shouldAutoGenerate } from "./secret-gen.ts";

describe("shouldAutoGenerate", () => {
  it.each([
    "BETTER_AUTH_SECRET",
    "WAITLIST_ADMIN_SECRET",
    "FOO_SECRET",
    "QSTASH_CURRENT_SIGNING_KEY",
  ])("returns true for %s", (key) => {
    expect(shouldAutoGenerate(key)).toBe(true);
  });

  it.each(["DATABASE_URL", "STRIPE_SECRET_KEY", "API_ORIGIN"])(
    "returns false for %s",
    (key) => {
      expect(shouldAutoGenerate(key)).toBe(false);
    },
  );

  it("is case-sensitive — only upper-snake matches", () => {
    expect(shouldAutoGenerate("foo_secret")).toBe(false);
  });
});

describe("generateSecret", () => {
  it("returns a 64-char hex string by default (32 bytes)", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
  });

  it("honours a custom byte length", () => {
    expect(generateSecret(16)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is unique across calls", () => {
    expect(generateSecret()).not.toBe(generateSecret());
  });
});
```

Note on `STRIPE_SECRET_KEY` — we don't auto-generate it because it's an external credential, not a local HMAC secret. The heuristic matches suffix `_SECRET` / `_SIGNING_KEY` but excludes keys where the word `SECRET` sits in the middle (i.e. `STRIPE_SECRET_KEY` — `_SECRET_` is infix, not suffix). The implementation below uses an "ends with _SECRET or _SIGNING_KEY" test.

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd /Users/sean/personal/orbit && npx vitest run scripts/lib/secret-gen.test.ts
```

Expected: fails — module does not exist.

- [ ] **Step 3: Implement the module**

Create `scripts/lib/secret-gen.ts`:

```ts
import { randomBytes } from "node:crypto";

/**
 * True when the env key names a local HMAC secret the script can
 * safely auto-generate. Intentionally suffix-based so external
 * credentials like `STRIPE_SECRET_KEY` are excluded — those are
 * provisioned outside the project and must be pasted in.
 */
export function shouldAutoGenerate(key: string): boolean {
  return /_(SECRET|SIGNING_KEY)$/.test(key) && /^[A-Z_]+$/.test(key);
}

export function generateSecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
cd /Users/sean/personal/orbit && npx vitest run scripts/lib/secret-gen.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/secret-gen.ts scripts/lib/secret-gen.test.ts
git commit -m "feat(scripts): add secret-gen utility"
```

---

## Task 5: Postgres probe utility

**Files:**
- Create: `scripts/lib/pg-probe.ts`

Small wrapper around `pg` that attempts a connect + trivial query and returns `{ok: true}` or `{ok: false, error}`. No tests — it'd require a real Postgres; covered in the Task 9 smoke.

- [ ] **Step 1: Create the module**

Create `scripts/lib/pg-probe.ts`:

```ts
import { Client } from "pg";

export interface ProbeOk {
  ok: true;
}
export interface ProbeFail {
  ok: false;
  error: string;
}
export type ProbeResult = ProbeOk | ProbeFail;

/**
 * Try to open a Postgres connection and run `SELECT 1`. Disconnects
 * regardless of outcome. Times out at 2 seconds.
 */
export async function probePostgres(url: string): Promise<ProbeResult> {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 2_000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await client.end().catch(() => {
      /* swallow — connection may never have been established */
    });
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -5
```

Expected: 8/8 pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/pg-probe.ts
git commit -m "feat(scripts): add pg-probe utility"
```

---

## Task 6: Create missing `.env.example` files

**Files:**
- Create: `apps/www/.env.example` (if missing)
- Create: `apps/web-tanstack/.env.example` (if missing)

The setup script needs a `.env.example` in each app to know what to prompt for. `apps/api/.env.example` already exists. Verify the other two before writing.

- [ ] **Step 1: Check what's missing**

```bash
ls -la apps/www/.env.example apps/web-tanstack/.env.example apps/web-next/.env.example 2>&1
```

Record which ones are missing. Only create the missing ones in the next steps.

- [ ] **Step 2: Create `apps/www/.env.example` (if missing)**

```env
# Public origin of the authenticated web app (used for "Sign in" and
# similar links from the marketing site). Defaults to localhost:4001.
VITE_WEB_URL="http://localhost:4001"

# Public origin of the Orbit API — form posts for the demo button land
# here. Defaults to localhost:4002.
VITE_API_URL="http://localhost:4002"

# Optional. Polar-hosted checkout URL for the Builder tier. If unset
# the "Get access" buttons fall back to /pricing. Get this URL from
# your Polar dashboard after creating the Builder product.
# VITE_POLAR_BUILDER_URL=""
```

- [ ] **Step 3: Create `apps/web-tanstack/.env.example` (if missing)**

```env
# Public origin of the Orbit API. Defaults to localhost:4002.
VITE_API_URL="http://localhost:4002"

# Public origin of the marketing site (used for "Start a new demo"
# links etc.). Defaults to localhost:4000.
VITE_WWW_URL="http://localhost:4000"
```

- [ ] **Step 4: Create `apps/web-next/.env.example` (if missing)**

Same content as web-tanstack (`VITE_API_URL` + `VITE_WWW_URL`). If web-next uses `NEXT_PUBLIC_*` instead of `VITE_*` (confirm by grepping its source for `import.meta.env` vs `process.env.NEXT_PUBLIC_`), use those names instead. If web-next reads the same two values from the same VITE names, use VITE.

**Verification command:**

```bash
grep -E "process\.env\.NEXT_PUBLIC_|import\.meta\.env\.VITE_" apps/web-next/src -r 2>/dev/null | head
```

Whichever prefix dominates, match it. Safe default if unclear: use `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WWW_URL` — Next 15 convention.

- [ ] **Step 5: Commit**

```bash
git add apps/www/.env.example apps/web-tanstack/.env.example apps/web-next/.env.example
# Some of those may not have been created — that's fine; git add is idempotent on non-existent paths via a glob, or just drop the ones that weren't needed.
git commit -m "chore: add .env.example for web apps"
```

If nothing was created (all three already existed), skip the commit.

---

## Task 7: Setup script pipeline

**Files:**
- Create: `scripts/setup.ts`

The main pipeline. Composes the utilities. Uses `@clack/prompts` for TTY UX.

- [ ] **Step 1: Create the script**

Create `scripts/setup.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Orbit one-command local bootstrap.
 *
 *   npm run setup
 *
 * Idempotent — each step skips cleanly if already satisfied. Never
 * asks about provider selection (Stripe / Polar / graphile / QStash);
 * those are baked in by the CLI scaffold. Fills in credentials and
 * local URLs for whatever the CLI compiled, generates any HMAC
 * secrets, runs migrations, prints next steps.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  text,
} from "@clack/prompts";

import { readEnvFile, type EnvLine } from "./lib/env-parser.ts";
import { serializeEnvFile, setEnvValue } from "./lib/env-writer.ts";
import { probePostgres } from "./lib/pg-probe.ts";
import { generateSecret, shouldAutoGenerate } from "./lib/secret-gen.ts";

const REPO_ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const REQUIRED_NODE_MAJOR = 20;
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/orbit";

interface EnvTarget {
  app: string;
  examplePath: string;
  realPath: string;
}

const ENV_TARGETS: EnvTarget[] = [
  {
    app: "apps/api",
    examplePath: resolve(REPO_ROOT, "apps/api/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/api/.env"),
  },
  {
    app: "apps/www",
    examplePath: resolve(REPO_ROOT, "apps/www/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/www/.env"),
  },
  {
    app: "apps/web-tanstack",
    examplePath: resolve(REPO_ROOT, "apps/web-tanstack/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/web-tanstack/.env"),
  },
  {
    app: "apps/web-next",
    examplePath: resolve(REPO_ROOT, "apps/web-next/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/web-next/.env"),
  },
];

function die(reason: string): never {
  cancel(reason);
  process.exit(1);
}

async function bailIfCancelled<T>(
  maybe: T | symbol,
  reason = "Setup paused. Re-run anytime with `npm run setup`.",
): Promise<T> {
  if (isCancel(maybe)) {
    cancel(reason);
    process.exit(0);
  }
  return maybe;
}

async function stepToolCheck(): Promise<void> {
  const versionString = process.versions.node;
  const major = Number(versionString.split(".")[0]);
  if (!Number.isFinite(major) || major < REQUIRED_NODE_MAJOR) {
    die(
      `Node ${REQUIRED_NODE_MAJOR}+ is required (you have ${versionString}).`,
    );
  }
  log.success(`Node ${versionString}`);
}

async function readDatabaseUrlCandidate(): Promise<string> {
  const apiEnv = resolve(REPO_ROOT, "apps/api/.env");
  const apiEnvExample = resolve(REPO_ROOT, "apps/api/.env.example");
  for (const path of [apiEnv, apiEnvExample]) {
    if (!existsSync(path)) continue;
    const lines = await readEnvFile(path);
    for (const line of lines) {
      if (
        line.kind === "var" &&
        !line.commentedOut &&
        line.key === "DATABASE_URL" &&
        line.value
      ) {
        return line.value;
      }
    }
  }
  return DEFAULT_DATABASE_URL;
}

async function stepPostgres(): Promise<string> {
  const candidate = await readDatabaseUrlCandidate();
  log.step("Checking Postgres reachability");
  let url = candidate;
  let probe = await probePostgres(url);

  while (!probe.ok) {
    log.warn(`Postgres not reachable at ${url}: ${probe.error}`);
    const choice = await bailIfCancelled(
      await select({
        message: "What do you want to do?",
        options: [
          {
            value: "docker",
            label: "Start the bundled docker compose (recommended)",
          },
          {
            value: "custom",
            label: "Enter a different connection string",
          },
          {
            value: "skip",
            label: "Skip — I'll configure this later",
          },
        ],
      }),
    );
    if (choice === "skip") {
      log.info("Skipping Postgres setup. You'll need a reachable DATABASE_URL before `npm run dev`.");
      return url;
    }
    if (choice === "docker") {
      const result = spawnSync(
        "docker",
        ["compose", "--profile", "dev", "up", "-d", "postgres"],
        { cwd: REPO_ROOT, stdio: "inherit" },
      );
      if (result.status !== 0) {
        log.warn(
          "docker compose failed. Falling back to manual connection string.",
        );
        const manual = await bailIfCancelled(
          await text({
            message: "Enter your Postgres connection string",
            initialValue: url,
          }),
        );
        url = manual;
      } else {
        // Wait up to 30s for the DB to become reachable.
        const start = Date.now();
        while (Date.now() - start < 30_000) {
          const p = await probePostgres(url);
          if (p.ok) break;
          await new Promise((r) => setTimeout(r, 1_000));
        }
      }
    }
    if (choice === "custom") {
      const manual = await bailIfCancelled(
        await text({
          message: "Enter your Postgres connection string",
          initialValue: url,
        }),
      );
      url = manual;
    }
    probe = await probePostgres(url);
  }

  log.success(`Postgres reachable at ${url}`);
  return url;
}

interface SyncOptions {
  showOptional: boolean;
  databaseUrl: string;
}

async function stepEnvSync(opts: SyncOptions): Promise<void> {
  for (const target of ENV_TARGETS) {
    if (!existsSync(target.examplePath)) continue;
    log.step(`Syncing ${target.app}/.env`);

    // If .env doesn't exist, seed it from .env.example.
    let lines: EnvLine[];
    if (existsSync(target.realPath)) {
      lines = await readEnvFile(target.realPath);
    } else {
      lines = await readEnvFile(target.examplePath);
    }

    const exampleLines = await readEnvFile(target.examplePath);

    for (const example of exampleLines) {
      if (example.kind !== "var") continue;
      if (example.commentedOut && !opts.showOptional) continue;

      const existing = lines.find(
        (l) => l.kind === "var" && l.key === example.key,
      ) as Extract<EnvLine, { kind: "var" }> | undefined;

      // Only prompt if: not present at all, or present but empty+uncommented.
      const alreadySet =
        existing && !existing.commentedOut && existing.value !== "";
      if (alreadySet) continue;

      // For DATABASE_URL, if we just probed one, use that as the default.
      let defaultValue: string;
      if (example.key === "DATABASE_URL" && opts.databaseUrl) {
        defaultValue = opts.databaseUrl;
      } else if (shouldAutoGenerate(example.key)) {
        defaultValue = generateSecret();
      } else {
        defaultValue = example.value;
      }

      const helpText = buildHelpText(exampleLines, example.key);
      const message = helpText
        ? `${example.key}\n  ${helpText}`
        : example.key;

      const answer = await bailIfCancelled(
        await text({
          message,
          initialValue: defaultValue,
          placeholder: defaultValue,
        }),
      );
      lines = setEnvValue(lines, example.key, answer);
    }

    await writeFile(target.realPath, serializeEnvFile(lines));
    log.success(`${target.app}/.env written`);
  }
}

/** Gather the `# ...` comment lines immediately above `key` in the example. */
function buildHelpText(lines: EnvLine[], key: string): string {
  const idx = lines.findIndex(
    (l) => l.kind === "var" && l.key === key,
  );
  if (idx === -1) return "";
  const buf: string[] = [];
  for (let i = idx - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.kind !== "comment") break;
    // Skip divider comments ("# ───...")
    if (/^#\s*[─-]{3,}/.test(line.text)) break;
    buf.unshift(line.text.replace(/^#\s?/, ""));
  }
  return buf.join(" ").slice(0, 160);
}

async function stepMigrations(): Promise<void> {
  log.step("Running Prisma migrations");
  const migrate = spawnSync(
    "npx",
    ["prisma", "migrate", "deploy"],
    { cwd: resolve(REPO_ROOT, "apps/api"), stdio: "inherit" },
  );
  if (migrate.status !== 0) {
    die(
      "Prisma migrate deploy failed. Inspect the error above. To wipe and reapply: `cd apps/api && npx prisma migrate reset`.",
    );
  }
  const generate = spawnSync(
    "npx",
    ["prisma", "generate"],
    { cwd: resolve(REPO_ROOT, "apps/api"), stdio: "inherit" },
  );
  if (generate.status !== 0) {
    die("Prisma generate failed.");
  }
  log.success("Prisma ready");
}

async function stepSeed(): Promise<void> {
  const seedPath = resolve(REPO_ROOT, "apps/api/prisma/seed.ts");
  if (!existsSync(seedPath)) return;
  const doSeed = await bailIfCancelled(
    await confirm({
      message: "Seed a demo workspace?",
      initialValue: true,
    }),
  );
  if (!doSeed) return;
  const result = spawnSync(
    "npx",
    ["prisma", "db", "seed"],
    { cwd: resolve(REPO_ROOT, "apps/api"), stdio: "inherit" },
  );
  if (result.status !== 0) {
    log.warn("Seed failed. Continuing — re-run with `npm run prisma:seed`.");
  }
}

async function stepSummary(databaseUrl: string): Promise<void> {
  const urls = [
    ["Postgres", databaseUrl],
    ["API", "http://localhost:4002"],
    ["Web (TanStack)", "http://localhost:4001"],
    ["Web (Next)", "http://localhost:4003"],
    ["Marketing", "http://localhost:4000"],
  ];
  for (const [label, value] of urls) {
    log.info(`${label.padEnd(18)} ${value}`);
  }
  outro("Setup complete — run: npm run dev");
}

async function main(): Promise<void> {
  intro("Orbit local setup");

  await stepToolCheck();
  const databaseUrl = await stepPostgres();

  const showOptional = await bailIfCancelled(
    await confirm({
      message:
        "Show optional configuration? (OAuth, webhook tunnels, etc.)",
      initialValue: false,
    }),
  );

  await stepEnvSync({ showOptional, databaseUrl });
  await stepMigrations();
  await stepSeed();
  await stepSummary(databaseUrl);
}

main().catch((err) => {
  die(
    `Setup failed: ${err instanceof Error ? err.message : String(err)}\n` +
      "Re-run `npm run setup` after resolving the issue.",
  );
});
```

- [ ] **Step 2: Make sure it's executable**

No chmod needed — `tsx` runs it without the shebang.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: 8/8 pass.

- [ ] **Step 4: Sanity-invoke with --help or dry-run**

There's no `--help` mode; just confirm the module loads without throwing a syntax error:

```bash
cd /Users/sean/personal/orbit && node -e "import('tsx/esm').then(() => require.resolve('./scripts/setup.ts'))" 2>&1 | tail -5 || true
```

Acceptable if the command short-circuits without error. The full smoke lands in Task 9.

- [ ] **Step 5: Commit**

```bash
git add scripts/setup.ts
git commit -m "feat(scripts): add interactive setup pipeline"
```

---

## Task 8: Quickstart doc page + nav

**Files:**
- Create: `apps/www/src/pages/docs/getting-started/quickstart.tsx`
- Create: `apps/www/src/routes/docs.getting-started.quickstart.tsx`
- Modify: `apps/www/src/components/docs-layout.tsx`

- [ ] **Step 1: Check how neighbour doc pages are structured**

Read `apps/www/src/pages/docs/getting-started/prerequisites.tsx` to learn the conventions (imports, heading pattern, code blocks, cross-links). Mirror exactly.

- [ ] **Step 2: Create the page**

Create `apps/www/src/pages/docs/getting-started/quickstart.tsx`. Base shape (adapt imports/styling to match `prerequisites.tsx`):

```tsx
import { DocsLayout, CodeBlock, DocsHeading, DocsParagraph, DocsLinkList } from "@/components/docs-layout";

export function QuickstartPage() {
  return (
    <DocsLayout active="/docs/getting-started/quickstart">
      <DocsHeading level={1}>Quickstart</DocsHeading>
      <DocsParagraph>
        Ship a running Orbit dashboard in under 5 minutes. Three commands,
        and `npm run setup` handles everything else — Postgres, env files,
        migrations, even generating a better-auth secret.
      </DocsParagraph>

      <DocsHeading level={2}>Prerequisites</DocsHeading>
      <DocsParagraph>
        Node 20+ and either Docker (for the bundled local Postgres) or a
        Postgres instance you already have reachable.
      </DocsParagraph>

      <DocsHeading level={2}>Three commands</DocsHeading>
      <CodeBlock language="bash">{`git clone https://github.com/were-orbit/orbit-starter.git
cd orbit-starter
npm install && npm run setup
npm run dev`}</CodeBlock>

      <DocsHeading level={2}>What `npm run setup` does</DocsHeading>
      <DocsParagraph>
        The setup script is idempotent — you can run it again any time
        and it only asks about things that still need configuring. On
        first run it:
      </DocsParagraph>
      <ul className="list-disc pl-5 text-sm text-muted-foreground">
        <li>Checks Node version and Postgres reachability (offers to start the bundled docker compose if not).</li>
        <li>Copies <code>.env.example</code> to <code>.env</code> for each app and prompts for any values you need to fill.</li>
        <li>Auto-generates HMAC secrets (<code>BETTER_AUTH_SECRET</code>, etc.) so you don't have to.</li>
        <li>Runs <code>prisma migrate deploy</code> + <code>prisma generate</code>.</li>
        <li>Offers to seed a demo workspace.</li>
      </ul>

      <DocsHeading level={2}>Next</DocsHeading>
      <DocsLinkList
        items={[
          { to: "/docs/getting-started/prerequisites", label: "Prerequisites — more detail on what you need installed" },
          { to: "/docs/getting-started/environment-variables", label: "Environment variables — every knob the kit exposes" },
          { to: "/docs/integrations/oauth", label: "OAuth — wiring up Google / Apple" },
          { to: "/docs/integrations/billing", label: "Billing — Stripe / Polar / Dodo setup" },
        ]}
      />
    </DocsLayout>
  );
}
```

**If `DocsHeading` / `DocsParagraph` / `DocsLinkList` don't exist** as named exports from `docs-layout`, mirror whatever the neighbour pages use. Raw `<h1>`, `<p>`, and `<ul>` with matching Tailwind classes is fine. Follow `prerequisites.tsx`'s pattern.

- [ ] **Step 3: Create the route file**

Create `apps/www/src/routes/docs.getting-started.quickstart.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { QuickstartPage } from "@/pages/docs/getting-started/quickstart";

export const Route = createFileRoute("/docs/getting-started/quickstart")({
  component: QuickstartPage,
});
```

- [ ] **Step 4: Add to docs nav**

Open `apps/www/src/components/docs-layout.tsx`. Find the "Getting started" section in the nav structure. Add `Quickstart` as the first item (before `Prerequisites`):

```tsx
      { label: "Quickstart", to: "/docs/getting-started/quickstart" },
      { label: "Prerequisites", to: "/docs/getting-started/prerequisites" },
      { label: "Running the CLI", to: "/docs/getting-started/running-the-cli" },
```

Keep the existing items' order.

- [ ] **Step 5: Regenerate the route tree**

```bash
cd /Users/sean/personal/orbit/apps/www && timeout 15 npm run dev 2>&1 | head -30 || true
```

Wait ~10 seconds for the dev server to generate `routeTree.gen.ts`, then stop. Verify:

```bash
grep -n "getting-started/quickstart" apps/www/src/routeTree.gen.ts
```

Expected: at least one match showing the route registered.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -5
```

Expected: 8/8 pass.

- [ ] **Step 7: Commit**

```bash
git add apps/www/src/pages/docs/getting-started/quickstart.tsx apps/www/src/routes/docs.getting-started.quickstart.tsx apps/www/src/components/docs-layout.tsx apps/www/src/routeTree.gen.ts
git commit -m "feat(www): add quickstart doc page"
```

---

## Task 9: End-to-end smoke test

No code changes expected. Verification only.

**Prereqs:**

- Docker running (or access to a Postgres you can point `DATABASE_URL` at).
- Clean checkout or willingness to `rm -rf apps/*/.env` for a fresh run.

- [ ] **Step 1: Snapshot current env files**

```bash
mv apps/api/.env /tmp/orbit-api-env.backup 2>/dev/null
mv apps/www/.env /tmp/orbit-www-env.backup 2>/dev/null
mv apps/web-tanstack/.env /tmp/orbit-webt-env.backup 2>/dev/null
mv apps/web-next/.env /tmp/orbit-webn-env.backup 2>/dev/null
```

(Skip files that don't exist.)

- [ ] **Step 2: Fresh Postgres**

```bash
docker compose --profile dev down -v
docker compose --profile dev up -d postgres
```

Wait 5 seconds.

- [ ] **Step 3: Run setup**

```bash
cd /Users/sean/personal/orbit && npm run setup
```

Accept every default. Decline "show optional". Accept the seed offer.

Expected: step-by-step log output, Postgres detected, env files written, Prisma migrated, summary printed.

- [ ] **Step 4: Start dev**

```bash
npm run dev
```

Expected: api/web-tanstack/web-next/www boot without errors.

Open `http://localhost:4000` — marketing site loads.
Open `http://localhost:4001` — auth page renders.

- [ ] **Step 5: Re-run setup (idempotency check)**

Stop `npm run dev`. Run:

```bash
npm run setup
```

Expected: no prompts about already-configured values. Completes quickly with "all set" output.

- [ ] **Step 6: Run unit tests**

```bash
cd /Users/sean/personal/orbit && npx vitest run scripts/lib
```

Expected: all tests pass.

- [ ] **Step 7: Restore env snapshots**

```bash
mv /tmp/orbit-api-env.backup apps/api/.env 2>/dev/null
mv /tmp/orbit-www-env.backup apps/www/.env 2>/dev/null
mv /tmp/orbit-webt-env.backup apps/web-tanstack/.env 2>/dev/null
mv /tmp/orbit-webn-env.backup apps/web-next/.env 2>/dev/null
```

- [ ] **Step 8: Commit any smoke-test fixes**

If the smoke test turned up a bug, commit the fix in a separate commit. Otherwise skip.

---

## Self-review (2026-04-24)

**Spec coverage:**
- Script language / runner (`tsx` + `npm run setup`) → Task 1 (package.json) + Task 7 (script).
- `@clack/prompts` → Task 1 (install) + Task 7 (use).
- Idempotency → Task 7 (all checks skip when satisfied).
- Never-asks-provider → Task 7 (it reads `.env.example` which was written by the CLI).
- Secret auto-gen heuristics → Task 4.
- Postgres bootstrap → Task 1 (compose) + Task 5 (probe) + Task 7 (step).
- Env sync with comment-preserving write → Tasks 2, 3, 7.
- Quickstart doc → Task 8.
- Testing (smoke only for script, unit for libs) → Tasks 2-4 (unit) + Task 9 (smoke).
- Risk 1 (dotenv writer) → Task 3.
- Risk 3 (docker detection) → Task 7 (`spawnSync` + status-code check + fallback).
- Risk 4 (Windows) → Task 7 (uses `node:crypto` via Task 4).
- Risk 5 (missing `.env.example` for web apps) → Task 6.

**Placeholder scan:** no "TBD" / "implement later" markers. One "fill in" exists inside generated output text (the bulleted list in the quickstart page) where that phrasing is meant for the user. Not a plan failure.

**Type consistency:** `EnvLine`, `parseEnvFile`, `serializeEnvFile`, `setEnvValue`, `probePostgres`, `shouldAutoGenerate`, `generateSecret` — identifiers used identically across Tasks 2-7. `ENV_TARGETS` → `REPO_ROOT` → `DEFAULT_DATABASE_URL` locally scoped to setup.ts.

**Known friction:**
- Task 6 is somewhat conditional (some `.env.example` files may already exist). The task includes a check step up front to decide.
- Task 8's exact imports from `docs-layout` depend on what that file exports. The step mirrors the pattern from `prerequisites.tsx` rather than prescribing named exports that may not exist.
