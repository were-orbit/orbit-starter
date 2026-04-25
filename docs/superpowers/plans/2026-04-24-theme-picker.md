# Theme Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/settings/appearance` stub in both authenticated apps with a two-row picker (Mode + Palette), persist the choice per-user on the `User` row, and sync across devices.

**Architecture:** Six-palette registry in `packages/ui` drives `html[data-palette="<id>"]` CSS-variable overrides. `ThemeProvider` gains a palette axis alongside the existing light/dark/system axis. A shared `<AppearancePicker />` component is dropped into both web-tanstack and web-next settings shells. Server-side, two new nullable columns on `User` and a lightweight `PATCH /v1/me/preferences` endpoint complete the round-trip.

**Tech Stack:** Tailwind v4 `@theme` CSS vars, `better-auth`, Prisma 7, Hono, TanStack Start (web-tanstack), Next 15 App Router (web-next), TanStack Query.

**Spec reference:** `docs/superpowers/specs/2026-04-24-theme-picker-design.md`.

---

## Ground rules for the implementer

- **No feature fences on this work.** Theme picker is a base product capability, not strippable.
- **No emojis** in code or commits (global CLAUDE.md).
- **Prefer `sg` (ast-grep)** for syntax-aware searches (global CLAUDE.md).
- **Commit after every task.** Each task ends with `git add` + `git commit`.
- **Commit message style:** lowercase imperative subject matching `git log` (e.g. `feat: ...`, `docs: ...`).
- **Identifiers used across tasks** — pin these early so later tasks don't drift:
  - `ORBIT_THEME_MODES = ["light", "dark", "system"] as const`
  - `ORBIT_THEME_PALETTES = ["graphite", "indigo", "crimson", "sage", "amber", "violet"] as const`
  - Types: `OrbitThemeMode` = `(typeof ORBIT_THEME_MODES)[number]`, `OrbitThemePalette` = `(typeof ORBIT_THEME_PALETTES)[number]`
  - Aggregate method: `User.updatePreferences({ themeMode?, themePalette? })`
  - Service: `UpdatePreferencesService`
  - Event: `UserPreferencesUpdated`
  - API route: `PATCH /v1/me/preferences`
  - Component: `<AppearancePicker onPersist={...} />`
  - Mutation hook: `useUpdatePreferencesMutation()`
  - Storage keys: `orbit-theme` (existing, unchanged) + `orbit-theme-palette` (new)

## File Structure

### New files

| Path                                                                 | Purpose                                                                  |
|----------------------------------------------------------------------|--------------------------------------------------------------------------|
| `packages/shared/src/themes.ts`                                      | Mode + palette constants, union types, validation helpers                |
| `packages/shared/src/themes.test.ts`                                 | Vitest unit for validators                                               |
| `packages/ui/src/themes/palettes.ts`                                 | Static palette registry (name + colors for each mode)                    |
| `packages/ui/src/themes/index.ts`                                    | Re-exports `PALETTES`, `OrbitThemePalette`                               |
| `packages/ui/src/components/appearance-picker.tsx`                   | Shared picker component with mini-chrome previews                        |
| `apps/api/prisma/migrations/<ts>_add_user_theme_prefs/migration.sql` | Generated                                                                |
| `apps/api/src/identity/application/update-preferences.service.ts`    | Application service                                                      |
| `apps/api/src/identity/application/update-preferences.service.test.ts`| Unit test                                                                |
| `apps/api/src/interfaces/http/controllers/me.preferences.controller.ts`| New PATCH endpoint                                                     |

### Modified files

| Path                                                                | Edit                                                                   |
|---------------------------------------------------------------------|------------------------------------------------------------------------|
| `apps/api/prisma/schema.prisma`                                     | Add `themeMode`, `themePalette` nullable string cols to `User`        |
| `apps/api/src/identity/domain/user.ts`                              | Add getters, `updatePreferences`, `UserPreferencesUpdated` event      |
| `apps/api/src/identity/infrastructure/prisma-user.repository.ts`    | Persist + rehydrate new fields                                        |
| `apps/api/src/identity/feature.ts`                                  | Wire `UpdatePreferencesService`                                       |
| `apps/api/src/interfaces/http/router.ts`                            | Mount `/v1/me/preferences`                                            |
| `apps/api/src/interfaces/mappers.ts`                                | `userToDTO` includes prefs                                            |
| `apps/api/src/interfaces/http/controllers/auth.controller.ts`       | `GET /v1/me` surfaces the new fields from the loaded aggregate        |
| `packages/shared/src/dto.ts`                                        | `UserDTO` gains `themeMode` + `themePalette`                          |
| `packages/shared/src/index.ts`                                      | Re-export the new `themes.ts` members                                 |
| `packages/ui/src/components/theme-provider.tsx`                     | Add palette axis + setter + effects                                   |
| `packages/ui/src/styles.css`                                        | Per-palette `html[data-palette="<id>"]` + `.dark` blocks              |
| `apps/web-tanstack/src/routes/__root.tsx`                           | First-paint script extended to apply `data-palette`                   |
| `apps/web-next/app/layout.tsx`                                      | Same script update                                                     |
| `apps/web-tanstack/src/lib/api/client.ts`                           | Add `api.me.updatePreferences(...)`                                   |
| `apps/web-tanstack/src/lib/mutations.ts`                            | Add `useUpdatePreferencesMutation`                                    |
| `apps/web-tanstack/src/lib/queries/session.ts`                      | Backfill: sync localStorage → server when server is null              |
| `apps/web-tanstack/src/pages/workspace-settings/appearance-page.tsx`| Render `<AppearancePicker />`                                         |
| `apps/web-next/src/views/workspace-settings/appearance-page.tsx`    | Same wrapper                                                          |
| `apps/web-next/src/lib/api/client.ts`                               | `api.me.updatePreferences(...)` (mirror web-tanstack shape)           |
| `apps/web-next/src/lib/mutations.ts`                                | `useUpdatePreferencesMutation` (mirror)                               |

---

## Task 1: Shared theme constants + types

**Files:**
- Create: `packages/shared/src/themes.ts`
- Create: `packages/shared/src/themes.test.ts`
- Modify: `packages/shared/src/index.ts`

TDD: write the failing test first.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/themes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  isOrbitThemeMode,
  isOrbitThemePalette,
  parseOrbitThemeMode,
  parseOrbitThemePalette,
  ORBIT_THEME_MODES,
  ORBIT_THEME_PALETTES,
} from "./themes.ts";

describe("themes", () => {
  it("exposes the fixed mode list", () => {
    expect(ORBIT_THEME_MODES).toEqual(["light", "dark", "system"]);
  });

  it("exposes the fixed palette list", () => {
    expect(ORBIT_THEME_PALETTES).toEqual([
      "graphite",
      "indigo",
      "crimson",
      "sage",
      "amber",
      "violet",
    ]);
  });

  it("recognises valid modes", () => {
    expect(isOrbitThemeMode("dark")).toBe(true);
    expect(isOrbitThemeMode("bogus")).toBe(false);
    expect(isOrbitThemeMode(null)).toBe(false);
  });

  it("recognises valid palettes", () => {
    expect(isOrbitThemePalette("indigo")).toBe(true);
    expect(isOrbitThemePalette("neon")).toBe(false);
  });

  it("parseOrbitThemeMode throws on unknown", () => {
    expect(() => parseOrbitThemeMode("bogus")).toThrow(/unknown theme mode/i);
  });

  it("parseOrbitThemePalette throws on unknown", () => {
    expect(() => parseOrbitThemePalette("neon")).toThrow(
      /unknown theme palette/i,
    );
  });

  it("parseOrbitThemeMode returns the input when valid", () => {
    expect(parseOrbitThemeMode("system")).toBe("system");
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd /Users/sean/personal/orbit/packages/shared && npx vitest run src/themes.test.ts
```

Expected: fails on unresolved import `./themes.ts`.

- [ ] **Step 3: Implement the module**

Create `packages/shared/src/themes.ts`:

```ts
export const ORBIT_THEME_MODES = ["light", "dark", "system"] as const;
export type OrbitThemeMode = (typeof ORBIT_THEME_MODES)[number];

export const ORBIT_THEME_PALETTES = [
  "graphite",
  "indigo",
  "crimson",
  "sage",
  "amber",
  "violet",
] as const;
export type OrbitThemePalette = (typeof ORBIT_THEME_PALETTES)[number];

export function isOrbitThemeMode(value: unknown): value is OrbitThemeMode {
  return (
    typeof value === "string" &&
    (ORBIT_THEME_MODES as readonly string[]).includes(value)
  );
}

export function isOrbitThemePalette(
  value: unknown,
): value is OrbitThemePalette {
  return (
    typeof value === "string" &&
    (ORBIT_THEME_PALETTES as readonly string[]).includes(value)
  );
}

export function parseOrbitThemeMode(value: unknown): OrbitThemeMode {
  if (!isOrbitThemeMode(value)) {
    throw new Error(`unknown theme mode: ${String(value)}`);
  }
  return value;
}

export function parseOrbitThemePalette(value: unknown): OrbitThemePalette {
  if (!isOrbitThemePalette(value)) {
    throw new Error(`unknown theme palette: ${String(value)}`);
  }
  return value;
}
```

- [ ] **Step 4: Re-export from the shared barrel**

Open `packages/shared/src/index.ts`. Add at the bottom:

```ts
export * from "./themes.ts";
```

(If `index.ts` uses a different re-export style — e.g. explicit named re-exports with path aliases like `./dto.ts` — mirror that style instead. Use `sg -lang typescript -p 'export * from "./dto.ts"'` in the file to check convention.)

- [ ] **Step 5: Run the test — confirm it passes**

```bash
cd /Users/sean/personal/orbit/packages/shared && npx vitest run src/themes.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 6: Typecheck at the root**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: all workspaces pass. (Pre-existing www doc-layout failures, if present, are acceptable.)

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/themes.ts packages/shared/src/themes.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add theme mode + palette constants and validators"
```

---

## Task 2: Palette registry in packages/ui

**Files:**
- Create: `packages/ui/src/themes/palettes.ts`
- Create: `packages/ui/src/themes/index.ts`

The registry is a static data module. Each palette maps to an object describing how the accent tokens (`--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`) change for that palette in light and dark modes. Graphite matches the current default (baseline reference); the other 5 override the accents while keeping the neutral tokens.

- [ ] **Step 1: Create the registry**

Create `packages/ui/src/themes/palettes.ts`:

```ts
import type { OrbitThemePalette } from "@orbit/shared/themes";

/**
 * Per-palette CSS variable overrides. Each palette declares its
 * accent-set values for light and dark modes. Neutral tokens
 * (`--background`, `--foreground`, `--border`) are not overridden
 * and come from the base theme in `styles.css`.
 *
 * Applied via `html[data-palette="<id>"]` (light) and
 * `html[data-palette="<id>"].dark` (dark) blocks in `styles.css`.
 * The TS data here is the single source of truth; Task 10 keeps the
 * CSS block in sync with this record by hand (a build-time codegen
 * is possible but out of scope).
 */
export interface PaletteVars {
  "--primary": string;
  "--primary-foreground": string;
  "--ring": string;
  "--sidebar-primary": string;
  "--sidebar-primary-foreground": string;
  "--sidebar-ring": string;
}

export interface PaletteDefinition {
  readonly id: OrbitThemePalette;
  readonly name: string;
  /** Short one-word accent description for aria-labels. */
  readonly accent: string;
  readonly light: PaletteVars;
  readonly dark: PaletteVars;
  /** 2 swatch hexes for the picker card dots (light, dark accent). */
  readonly swatch: readonly [string, string];
}

export const PALETTES: Record<OrbitThemePalette, PaletteDefinition> = {
  graphite: {
    id: "graphite",
    name: "Graphite",
    accent: "neutral",
    light: {
      "--primary": "var(--color-neutral-800)",
      "--primary-foreground": "var(--color-neutral-50)",
      "--ring": "var(--color-neutral-400)",
      "--sidebar-primary": "var(--color-neutral-800)",
      "--sidebar-primary-foreground": "var(--color-neutral-50)",
      "--sidebar-ring": "var(--color-neutral-400)",
    },
    dark: {
      "--primary": "var(--color-neutral-100)",
      "--primary-foreground": "var(--color-neutral-800)",
      "--ring": "var(--color-neutral-500)",
      "--sidebar-primary": "var(--color-neutral-100)",
      "--sidebar-primary-foreground": "var(--color-neutral-800)",
      "--sidebar-ring": "var(--color-neutral-400)",
    },
    swatch: ["#71717a", "#a1a1aa"],
  },
  indigo: {
    id: "indigo",
    name: "Indigo",
    accent: "blue",
    light: {
      "--primary": "var(--color-blue-600)",
      "--primary-foreground": "var(--color-blue-50)",
      "--ring": "var(--color-blue-400)",
      "--sidebar-primary": "var(--color-blue-600)",
      "--sidebar-primary-foreground": "var(--color-blue-50)",
      "--sidebar-ring": "var(--color-blue-400)",
    },
    dark: {
      "--primary": "var(--color-blue-400)",
      "--primary-foreground": "var(--color-blue-950)",
      "--ring": "var(--color-blue-500)",
      "--sidebar-primary": "var(--color-blue-400)",
      "--sidebar-primary-foreground": "var(--color-blue-950)",
      "--sidebar-ring": "var(--color-blue-500)",
    },
    swatch: ["#3b82f6", "#1e40af"],
  },
  crimson: {
    id: "crimson",
    name: "Crimson",
    accent: "red",
    light: {
      "--primary": "var(--color-red-600)",
      "--primary-foreground": "var(--color-red-50)",
      "--ring": "var(--color-red-400)",
      "--sidebar-primary": "var(--color-red-600)",
      "--sidebar-primary-foreground": "var(--color-red-50)",
      "--sidebar-ring": "var(--color-red-400)",
    },
    dark: {
      "--primary": "var(--color-red-400)",
      "--primary-foreground": "var(--color-red-950)",
      "--ring": "var(--color-red-500)",
      "--sidebar-primary": "var(--color-red-400)",
      "--sidebar-primary-foreground": "var(--color-red-950)",
      "--sidebar-ring": "var(--color-red-500)",
    },
    swatch: ["#ef4444", "#991b1b"],
  },
  sage: {
    id: "sage",
    name: "Sage",
    accent: "green",
    light: {
      "--primary": "var(--color-emerald-600)",
      "--primary-foreground": "var(--color-emerald-50)",
      "--ring": "var(--color-emerald-400)",
      "--sidebar-primary": "var(--color-emerald-600)",
      "--sidebar-primary-foreground": "var(--color-emerald-50)",
      "--sidebar-ring": "var(--color-emerald-400)",
    },
    dark: {
      "--primary": "var(--color-emerald-400)",
      "--primary-foreground": "var(--color-emerald-950)",
      "--ring": "var(--color-emerald-500)",
      "--sidebar-primary": "var(--color-emerald-400)",
      "--sidebar-primary-foreground": "var(--color-emerald-950)",
      "--sidebar-ring": "var(--color-emerald-500)",
    },
    swatch: ["#22c55e", "#15803d"],
  },
  amber: {
    id: "amber",
    name: "Amber",
    accent: "amber",
    light: {
      "--primary": "var(--color-amber-600)",
      "--primary-foreground": "var(--color-amber-50)",
      "--ring": "var(--color-amber-400)",
      "--sidebar-primary": "var(--color-amber-600)",
      "--sidebar-primary-foreground": "var(--color-amber-50)",
      "--sidebar-ring": "var(--color-amber-400)",
    },
    dark: {
      "--primary": "var(--color-amber-400)",
      "--primary-foreground": "var(--color-amber-950)",
      "--ring": "var(--color-amber-500)",
      "--sidebar-primary": "var(--color-amber-400)",
      "--sidebar-primary-foreground": "var(--color-amber-950)",
      "--sidebar-ring": "var(--color-amber-500)",
    },
    swatch: ["#f59e0b", "#b45309"],
  },
  violet: {
    id: "violet",
    name: "Violet",
    accent: "purple",
    light: {
      "--primary": "var(--color-violet-600)",
      "--primary-foreground": "var(--color-violet-50)",
      "--ring": "var(--color-violet-400)",
      "--sidebar-primary": "var(--color-violet-600)",
      "--sidebar-primary-foreground": "var(--color-violet-50)",
      "--sidebar-ring": "var(--color-violet-400)",
    },
    dark: {
      "--primary": "var(--color-violet-400)",
      "--primary-foreground": "var(--color-violet-950)",
      "--ring": "var(--color-violet-500)",
      "--sidebar-primary": "var(--color-violet-400)",
      "--sidebar-primary-foreground": "var(--color-violet-950)",
      "--sidebar-ring": "var(--color-violet-500)",
    },
    swatch: ["#a855f7", "#7e22ce"],
  },
};

export const DEFAULT_PALETTE: OrbitThemePalette = "graphite";
```

- [ ] **Step 2: Create the barrel**

Create `packages/ui/src/themes/index.ts`:

```ts
export { PALETTES, DEFAULT_PALETTE } from "./palettes.ts";
export type { PaletteDefinition, PaletteVars } from "./palettes.ts";
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: passes. If `@orbit/shared/themes` import doesn't resolve, confirm Task 1's barrel export.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/themes/palettes.ts packages/ui/src/themes/index.ts
git commit -m "feat(ui): add six-palette theme registry"
```

---

## Task 3: Schema — add `themeMode` + `themePalette` to User

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

Both columns nullable. Null = app default.

- [ ] **Step 1: Edit the schema**

Open `apps/api/prisma/schema.prisma`. Inside `model User { ... }`, add two fields near the other user-scalar fields (before any relation fields, below `avatarTone`):

```prisma
  themeMode     String?
  themePalette  String?
```

No feature fences. This is a base capability.

- [ ] **Step 2: Create the migration**

```bash
npm run prisma:migrate -- --name add_user_theme_prefs --create-only
```

Open the generated `apps/api/prisma/migrations/<timestamp>_add_user_theme_prefs/migration.sql`. It must contain:

```sql
ALTER TABLE "users" ADD COLUMN "themeMode" TEXT;
ALTER TABLE "users" ADD COLUMN "themePalette" TEXT;
```

(Prisma may combine both into one statement — acceptable.)

If either is missing, fix the schema and regenerate. Do NOT edit the migration SQL by hand.

- [ ] **Step 3: Apply + regenerate**

```bash
npm run prisma:migrate
npm run prisma:generate
```

Expected: migration applies cleanly, client regenerates.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/sean/personal/orbit/apps/api && npm run typecheck
```

Expected: passes (columns are additive).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(api): add themeMode + themePalette columns to user"
```

---

## Task 4: Extend `User` aggregate with preferences

**Files:**
- Modify: `apps/api/src/identity/domain/user.ts`

Add the two fields as private state + public getters. Add `updatePreferences({ themeMode?, themePalette? })` and the `UserPreferencesUpdated` domain event.

- [ ] **Step 1: Extend the file**

Open `apps/api/src/identity/domain/user.ts`. Add near the top (after existing imports):

```ts
import {
  type OrbitThemeMode,
  type OrbitThemePalette,
  parseOrbitThemeMode,
  parseOrbitThemePalette,
} from "@orbit/shared/themes";
```

Inside the `User` class (below the existing private constructor):

1. Add two private fields:

```ts
  private _themeMode: OrbitThemeMode | null;
  private _themePalette: OrbitThemePalette | null;
```

2. Update the constructor signature to accept them (extend the parameter list — the aggregate is private-constructor + static factories, so only `register` and `rehydrate` call `new User(...)`):

```ts
  private constructor(
    public readonly id: UserId,
    private _email: Email,
    private _name: string,
    private _avatarTone: number,
    public readonly createdAt: Date,
    themeMode: OrbitThemeMode | null,
    themePalette: OrbitThemePalette | null,
  ) {
    this._themeMode = themeMode;
    this._themePalette = themePalette;
  }
```

3. Update `User.register(...)` to pass `null, null` for the two new fields (new users default to null = app default).

4. Update `User.rehydrate(...)` to accept them in `props`:

```ts
  static rehydrate(props: {
    id: UserId;
    email: Email;
    name: string;
    avatarTone: number;
    createdAt: Date;
    themeMode: OrbitThemeMode | null;
    themePalette: OrbitThemePalette | null;
  }): User {
    return new User(
      props.id,
      props.email,
      props.name,
      props.avatarTone,
      props.createdAt,
      props.themeMode,
      props.themePalette,
    );
  }
```

5. Add getters (next to `get email()`):

```ts
  get themeMode(): OrbitThemeMode | null {
    return this._themeMode;
  }
  get themePalette(): OrbitThemePalette | null {
    return this._themePalette;
  }
```

6. Add the method:

```ts
  updatePreferences(input: {
    themeMode?: OrbitThemeMode | null;
    themePalette?: OrbitThemePalette | null;
  }): void {
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(input, "themeMode")) {
      const next =
        input.themeMode === null ? null : parseOrbitThemeMode(input.themeMode);
      if (next !== this._themeMode) {
        this._themeMode = next;
        changed = true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, "themePalette")) {
      const next =
        input.themePalette === null
          ? null
          : parseOrbitThemePalette(input.themePalette);
      if (next !== this._themePalette) {
        this._themePalette = next;
        changed = true;
      }
    }
    if (changed) {
      this.events.push(new UserPreferencesUpdated(this.id, new Date()));
    }
  }
```

7. Add the domain event class (below `UserRegistered`):

```ts
export class UserPreferencesUpdated extends DomainEvent {
  readonly type = "identity.user.preferences_updated";
  constructor(
    readonly userId: UserId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}
```

- [ ] **Step 2: Typecheck — expect it to FAIL**

```bash
cd /Users/sean/personal/orbit/apps/api && npm run typecheck 2>&1 | tail -20
```

Expected: fails in `apps/api/src/identity/infrastructure/prisma-user.repository.ts` because `User.rehydrate` now requires `themeMode` + `themePalette` fields. We fix that in Task 5 — proceed but don't commit yet.

- [ ] **Step 3: Do NOT commit yet — Task 5 fixes the repository; they land together**

Skip straight to Task 5 while the working tree has these domain edits. Tasks 4 + 5 commit together at the end of Task 5.

---

## Task 5: Update Prisma `User` repository mapping

**Files:**
- Modify: `apps/api/src/identity/infrastructure/prisma-user.repository.ts`

The repository translates between the Prisma row and the `User` aggregate. It needs to read + write the new columns.

- [ ] **Step 1: Read the existing repository to find the mapping points**

Open `apps/api/src/identity/infrastructure/prisma-user.repository.ts`. Find:
- The function that converts a Prisma row into a `User` via `User.rehydrate` (look for `User.rehydrate(`).
- The function that converts a `User` into a Prisma `create`/`update` payload (look for `save` or `upsert`).

Note the exact names — the rest of the task text assumes `rehydrate`-on-read and `user.upsert`-on-save, but the repository may use a different shape.

- [ ] **Step 2: Extend the rehydrate call**

In the function that reads a Prisma row, when you call `User.rehydrate({...})`, add the two fields. Import the type guards first:

```ts
import { isOrbitThemeMode, isOrbitThemePalette } from "@orbit/shared/themes";
```

Then in the rehydrate arg:

```ts
      themeMode: isOrbitThemeMode(row.themeMode) ? row.themeMode : null,
      themePalette: isOrbitThemePalette(row.themePalette)
        ? row.themePalette
        : null,
```

The type-guard filter is defensive: if a stored string is later removed from the registry, we rehydrate as `null` rather than blowing up.

- [ ] **Step 3: Extend the save payload**

In the function that writes a `User` row, include:

```ts
      themeMode: user.themeMode,
      themePalette: user.themePalette,
```

in both the `create` and `update` branches of the upsert (or wherever the persisted columns are listed).

- [ ] **Step 4: Typecheck**

```bash
cd /Users/sean/personal/orbit/apps/api && npm run typecheck
```

Expected: passes.

- [ ] **Step 5: Commit (tasks 4 + 5 together)**

```bash
git add apps/api/src/identity/domain/user.ts apps/api/src/identity/infrastructure/prisma-user.repository.ts
git commit -m "feat(identity): add theme mode + palette to user aggregate"
```

---

## Task 6: `UpdatePreferencesService` + unit tests

**Files:**
- Create: `apps/api/src/identity/application/update-preferences.service.ts`
- Create: `apps/api/src/identity/application/update-preferences.service.test.ts`
- Modify: `apps/api/src/identity/feature.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/identity/application/update-preferences.service.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdatePreferencesService } from "./update-preferences.service.ts";
import { User } from "@/identity/domain/user.ts";
import { Email } from "@/identity/domain/email.ts";
import { FakeClock } from "@/kernel/clock.ts";

function buildUser(clock: FakeClock): User {
  return User.register(
    { email: Email.parse("ada@example.com"), name: "Ada" },
    clock,
  );
}

function makeUow(user: User) {
  const saved: User[] = [];
  const uow = {
    run: async <T,>(fn: (tx: unknown) => Promise<T>) => {
      const tx = {
        users: {
          findById: vi.fn(async () => user),
          save: vi.fn(async (u: User) => {
            saved.push(u);
          }),
        },
        events: { add: vi.fn(), addMany: vi.fn() },
      };
      return fn(tx);
    },
    read: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({} as never),
  };
  return { uow, saved };
}

describe("UpdatePreferencesService", () => {
  let clock: FakeClock;
  beforeEach(() => {
    clock = new FakeClock(new Date(Date.UTC(2026, 3, 24, 12, 0, 0)));
  });

  it("updates both fields and saves", async () => {
    const user = buildUser(clock);
    const { uow, saved } = makeUow(user);
    const svc = new UpdatePreferencesService(uow as never);
    await svc.execute({
      userId: user.id,
      themeMode: "dark",
      themePalette: "indigo",
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]!.themeMode).toBe("dark");
    expect(saved[0]!.themePalette).toBe("indigo");
  });

  it("leaves omitted fields untouched", async () => {
    const user = buildUser(clock);
    user.updatePreferences({ themeMode: "dark", themePalette: "indigo" });
    const { uow, saved } = makeUow(user);
    const svc = new UpdatePreferencesService(uow as never);
    await svc.execute({ userId: user.id, themeMode: "light" });
    expect(saved[0]!.themeMode).toBe("light");
    expect(saved[0]!.themePalette).toBe("indigo");
  });

  it("passing null clears the field", async () => {
    const user = buildUser(clock);
    user.updatePreferences({ themeMode: "dark", themePalette: "indigo" });
    const { uow, saved } = makeUow(user);
    const svc = new UpdatePreferencesService(uow as never);
    await svc.execute({
      userId: user.id,
      themeMode: null,
      themePalette: null,
    });
    expect(saved[0]!.themeMode).toBeNull();
    expect(saved[0]!.themePalette).toBeNull();
  });

  it("throws on unknown enum strings", async () => {
    const user = buildUser(clock);
    const { uow } = makeUow(user);
    const svc = new UpdatePreferencesService(uow as never);
    await expect(
      svc.execute({ userId: user.id, themePalette: "neon" as never }),
    ).rejects.toThrow(/unknown theme palette/i);
  });

  it("throws when the user does not exist", async () => {
    const user = buildUser(clock);
    const { uow } = makeUow(user);
    const saved = (uow as never as { saved?: User[] }).saved ?? [];
    // Rebind findById to return null for this case
    const emptyUow = {
      run: async <T,>(fn: (tx: unknown) => Promise<T>) =>
        fn({
          users: { findById: vi.fn(async () => null), save: vi.fn() },
          events: { add: vi.fn(), addMany: vi.fn() },
        }),
      read: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({} as never),
    };
    const svc = new UpdatePreferencesService(emptyUow as never);
    await expect(
      svc.execute({ userId: user.id, themeMode: "dark" }),
    ).rejects.toThrow(/user not found/i);
    void saved;
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd /Users/sean/personal/orbit/apps/api && npx vitest run src/identity/application/update-preferences.service.test.ts
```

Expected: fails — module does not exist.

- [ ] **Step 3: Implement the service**

Create `apps/api/src/identity/application/update-preferences.service.ts`:

```ts
import type { UserId } from "@/identity/domain/user.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import { NotFoundError } from "@/kernel/errors.ts";
import type { OrbitThemeMode, OrbitThemePalette } from "@orbit/shared/themes";

export interface UpdatePreferencesCommand {
  userId: UserId;
  themeMode?: OrbitThemeMode | null;
  themePalette?: OrbitThemePalette | null;
}

/**
 * Updates the authenticated user's UI preferences (theme mode and
 * palette). Only fields explicitly present on the input are changed;
 * missing fields are left untouched. Passing `null` clears to default.
 *
 * Validation of the enum strings is delegated to the aggregate's
 * `updatePreferences` method, which uses `parseOrbitThemeMode` /
 * `parseOrbitThemePalette` to throw on unknown values.
 */
export class UpdatePreferencesService {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(cmd: UpdatePreferencesCommand): Promise<void> {
    await this.uow.run(async (tx) => {
      const user = await tx.users.findById(cmd.userId);
      if (!user) {
        throw new NotFoundError("user.not_found", "user not found");
      }
      const patch: Parameters<typeof user.updatePreferences>[0] = {};
      if (Object.prototype.hasOwnProperty.call(cmd, "themeMode")) {
        patch.themeMode = cmd.themeMode ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(cmd, "themePalette")) {
        patch.themePalette = cmd.themePalette ?? null;
      }
      user.updatePreferences(patch);
      await tx.users.save(user);
      tx.events.addMany(user.pullEvents());
    });
  }
}
```

- [ ] **Step 4: Wire into `identityFeature`**

Open `apps/api/src/identity/feature.ts`:

```ts
import type { FeatureCore, FeatureModule } from "@/kernel/feature.ts";
import { GetMeService } from "@/identity/application/get-me.service.ts";
import { UpdatePreferencesService } from "@/identity/application/update-preferences.service.ts";

export interface IdentityServices {
  getMe: GetMeService;
  updatePreferences: UpdatePreferencesService;
}

export const identityFeature: FeatureModule<IdentityServices> = {
  name: "identity",
  services: (core: FeatureCore) => ({
    getMe: new GetMeService(core.uow),
    updatePreferences: new UpdatePreferencesService(core.uow),
  }),
};
```

- [ ] **Step 5: Run the test — confirm it passes**

```bash
cd /Users/sean/personal/orbit/apps/api && npx vitest run src/identity/application/update-preferences.service.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/sean/personal/orbit/apps/api && npm run typecheck
```

Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/identity/application/update-preferences.service.ts apps/api/src/identity/application/update-preferences.service.test.ts apps/api/src/identity/feature.ts
git commit -m "feat(identity): add UpdatePreferencesService"
```

---

## Task 7: DTO + mapper extension

**Files:**
- Modify: `packages/shared/src/dto.ts`
- Modify: `apps/api/src/interfaces/mappers.ts`
- Modify: `apps/api/src/interfaces/http/controllers/auth.controller.ts`

- [ ] **Step 1: Extend `UserDTO`**

Open `packages/shared/src/dto.ts`. Add two fields to the `UserDTO` interface (add an import at the top for the union types):

```ts
import type { OrbitThemeMode, OrbitThemePalette } from "./themes.ts";
```

And inside `UserDTO`, add after `avatarTone`:

```ts
  themeMode: OrbitThemeMode | null;
  themePalette: OrbitThemePalette | null;
```

Keep the existing fenced `+feature:demo` fields (`isDemo`, `demoExpiresAt`) exactly where they are.

- [ ] **Step 2: Update `userToDTO`**

Open `apps/api/src/interfaces/mappers.ts`. In `userToDTO`, add the two fields:

```ts
export function userToDTO(u: User): UserDTO {
  return {
    id: u.id,
    email: u.email.value,
    name: u.name,
    avatarTone: u.avatarTone,
    createdAt: u.createdAt.toISOString(),
    themeMode: u.themeMode,
    themePalette: u.themePalette,
  };
}
```

The `themeMode` / `themePalette` values come from the aggregate (Task 4 exposed them as getters) so no second Prisma read is needed — `/v1/me` already calls `userToDTO`.

- [ ] **Step 3: Confirm `/v1/me` returns the fields**

Open `apps/api/src/interfaces/http/controllers/auth.controller.ts`. The handler spreads `userToDTO(user)` into `c.json({ user: { ...userToDTO(user), /* demo overrides */ } ... })`. No code changes expected here — the new fields flow through automatically because the spread includes them. Confirm by reading the file; no edit unless the spread shape has diverged.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: all workspaces pass. If any workspace complains that `UserDTO` now requires the two new fields, it's at a construction site. Find it and include `themeMode: null, themePalette: null`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/dto.ts apps/api/src/interfaces/mappers.ts
# Include auth.controller.ts only if you actually edited it
git status --porcelain apps/api/src/interfaces/http/controllers/auth.controller.ts | grep -q . && git add apps/api/src/interfaces/http/controllers/auth.controller.ts
git commit -m "feat(api): expose themeMode + themePalette on user dto"
```

---

## Task 8: `PATCH /v1/me/preferences` controller + mount

**Files:**
- Create: `apps/api/src/interfaces/http/controllers/me.preferences.controller.ts`
- Modify: `apps/api/src/interfaces/http/router.ts`

- [ ] **Step 1: Create the controller**

Create `apps/api/src/interfaces/http/controllers/me.preferences.controller.ts`:

```ts
import { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../middleware/session.ts";
import { ValidationError } from "@/kernel/errors.ts";
import {
  ORBIT_THEME_MODES,
  ORBIT_THEME_PALETTES,
} from "@orbit/shared/themes";
import type { HonoEnv } from "../middleware/container.ts";
import type { UserId } from "@/identity/domain/user.ts";

const BodySchema = z.object({
  themeMode: z.enum(ORBIT_THEME_MODES).nullable().optional(),
  themePalette: z.enum(ORBIT_THEME_PALETTES).nullable().optional(),
});

export const mePreferences = new Hono<HonoEnv>();

mePreferences.patch("/", async (c) => {
  const container = c.get("container");
  const session = requireSession(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError(
      "validation",
      "body must be valid JSON",
    );
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "validation",
      parsed.error.issues[0]?.message ?? "invalid body",
    );
  }

  await container.services.updatePreferences.execute({
    userId: session.userId as UserId,
    ...parsed.data,
  });

  // Read back the authoritative stored values so the client can
  // reconcile its local cache without a second round-trip.
  const { user } = await container.services.getMe.resolveByUserId(
    session.userId as UserId,
  );

  c.get("log")?.set({
    action: "me.updatePreferences",
    themeMode: user.themeMode,
    themePalette: user.themePalette,
  });

  return c.json({
    themeMode: user.themeMode,
    themePalette: user.themePalette,
  });
});
```

- [ ] **Step 2: Mount in the router**

Open `apps/api/src/interfaces/http/router.ts`. Add an import alongside the other controller imports:

```ts
import { mePreferences } from "./controllers/me.preferences.controller.ts";
```

And in `buildRouter()`, add immediately after the `v1.route("/me", me);` line:

```ts
  v1.route("/me/preferences", mePreferences);
```

No fences — base capability.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/sean/personal/orbit/apps/api && npm run typecheck
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/interfaces/http/controllers/me.preferences.controller.ts apps/api/src/interfaces/http/router.ts
git commit -m "feat(api): add PATCH /v1/me/preferences"
```

---

## Task 9: Extend `ThemeProvider` with palette axis

**Files:**
- Modify: `packages/ui/src/components/theme-provider.tsx`

Add `palette` state, `setPalette`, DOM effect that writes `data-palette="<id>"` on `<html>`, and a localStorage key `orbit-theme-palette`.

- [ ] **Step 1: Replace the file**

Rewrite `packages/ui/src/components/theme-provider.tsx` to add the palette axis. Keep the existing exports (`ORBIT_THEME_STORAGE_KEY`, `OrbitThemePreference`, `ThemeProvider`, `useTheme`) stable so the head-inline scripts in each app continue to resolve. Add:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isOrbitThemePalette,
  type OrbitThemePalette,
} from "@orbit/shared/themes";
import { DEFAULT_PALETTE } from "../themes/palettes.ts";

/** localStorage key for mode preference. */
export const ORBIT_THEME_STORAGE_KEY = "orbit-theme";
/** localStorage key for palette preference. */
export const ORBIT_THEME_PALETTE_STORAGE_KEY = "orbit-theme-palette";

export type OrbitThemePreference = "light" | "dark" | "system";

function readPreference(): OrbitThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(ORBIT_THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

function readPalette(): OrbitThemePalette {
  if (typeof window === "undefined") return DEFAULT_PALETTE;
  try {
    const raw = localStorage.getItem(ORBIT_THEME_PALETTE_STORAGE_KEY);
    if (isOrbitThemePalette(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_PALETTE;
}

function readOsScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

type ThemeContextValue = {
  preference: OrbitThemePreference;
  resolved: "light" | "dark";
  palette: OrbitThemePalette;
  setPreference: (p: OrbitThemePreference) => void;
  setPalette: (p: OrbitThemePalette) => void;
  toggleLightDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<OrbitThemePreference>(() =>
    typeof window === "undefined" ? "system" : readPreference(),
  );

  const [osScheme, setOsScheme] = useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "dark" : readOsScheme(),
  );

  const [palette, setPaletteState] = useState<OrbitThemePalette>(() =>
    typeof window === "undefined" ? DEFAULT_PALETTE : readPalette(),
  );

  const resolved = useMemo(
    () => (preference === "system" ? osScheme : preference),
    [preference, osScheme],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
  }, [palette]);

  useEffect(() => {
    try {
      localStorage.setItem(ORBIT_THEME_STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
  }, [preference]);

  useEffect(() => {
    try {
      localStorage.setItem(ORBIT_THEME_PALETTE_STORAGE_KEY, palette);
    } catch {
      /* ignore */
    }
  }, [palette]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setOsScheme(mq.matches ? "dark" : "light");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((p: OrbitThemePreference) => {
    setPreferenceState(p);
  }, []);

  const setPalette = useCallback((p: OrbitThemePalette) => {
    setPaletteState(p);
  }, []);

  const toggleLightDark = useCallback(() => {
    setPreferenceState((prev) => {
      const r =
        prev === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : prev;
      return r === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      palette,
      setPreference,
      setPalette,
      toggleLightDark,
    }),
    [preference, resolved, palette, setPreference, setPalette, toggleLightDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/theme-provider.tsx
git commit -m "feat(ui): add palette axis to ThemeProvider"
```

---

## Task 10: CSS palette blocks

**Files:**
- Modify: `packages/ui/src/styles.css`

Add per-palette override blocks that map each palette id to its accent tokens in both modes. Blocks apply only when `html[data-palette="<id>"]` is set; "graphite" is a no-op since it matches the base theme, but include the block for completeness (future-proofs if anyone removes neutrals from the base).

- [ ] **Step 1: Add the blocks**

Open `packages/ui/src/styles.css`. Find the end of the `.dark { ... }` block (after all the `.dark` token overrides). Insert the palette blocks immediately after:

```css
/* ──────────────────────────────────────────────────────────────── */
/* Palette overrides                                                 */
/* Each palette redefines the accent-set tokens (primary / ring /    */
/* sidebar-primary / sidebar-ring) for light and dark. Base neutral  */
/* tokens stay as-is. Source of truth for the values lives in        */
/* packages/ui/src/themes/palettes.ts — keep in sync by hand.        */
/* ──────────────────────────────────────────────────────────────── */

html[data-palette="graphite"] {
  /* matches :root defaults — kept for explicitness */
  --primary: var(--color-neutral-800);
  --primary-foreground: var(--color-neutral-50);
  --ring: var(--color-neutral-400);
  --sidebar-primary: var(--color-neutral-800);
  --sidebar-primary-foreground: var(--color-neutral-50);
  --sidebar-ring: var(--color-neutral-400);
}
html[data-palette="graphite"].dark {
  --primary: var(--color-neutral-100);
  --primary-foreground: var(--color-neutral-800);
  --ring: var(--color-neutral-500);
  --sidebar-primary: var(--color-neutral-100);
  --sidebar-primary-foreground: var(--color-neutral-800);
  --sidebar-ring: var(--color-neutral-400);
}

html[data-palette="indigo"] {
  --primary: var(--color-blue-600);
  --primary-foreground: var(--color-blue-50);
  --ring: var(--color-blue-400);
  --sidebar-primary: var(--color-blue-600);
  --sidebar-primary-foreground: var(--color-blue-50);
  --sidebar-ring: var(--color-blue-400);
}
html[data-palette="indigo"].dark {
  --primary: var(--color-blue-400);
  --primary-foreground: var(--color-blue-950);
  --ring: var(--color-blue-500);
  --sidebar-primary: var(--color-blue-400);
  --sidebar-primary-foreground: var(--color-blue-950);
  --sidebar-ring: var(--color-blue-500);
}

html[data-palette="crimson"] {
  --primary: var(--color-red-600);
  --primary-foreground: var(--color-red-50);
  --ring: var(--color-red-400);
  --sidebar-primary: var(--color-red-600);
  --sidebar-primary-foreground: var(--color-red-50);
  --sidebar-ring: var(--color-red-400);
}
html[data-palette="crimson"].dark {
  --primary: var(--color-red-400);
  --primary-foreground: var(--color-red-950);
  --ring: var(--color-red-500);
  --sidebar-primary: var(--color-red-400);
  --sidebar-primary-foreground: var(--color-red-950);
  --sidebar-ring: var(--color-red-500);
}

html[data-palette="sage"] {
  --primary: var(--color-emerald-600);
  --primary-foreground: var(--color-emerald-50);
  --ring: var(--color-emerald-400);
  --sidebar-primary: var(--color-emerald-600);
  --sidebar-primary-foreground: var(--color-emerald-50);
  --sidebar-ring: var(--color-emerald-400);
}
html[data-palette="sage"].dark {
  --primary: var(--color-emerald-400);
  --primary-foreground: var(--color-emerald-950);
  --ring: var(--color-emerald-500);
  --sidebar-primary: var(--color-emerald-400);
  --sidebar-primary-foreground: var(--color-emerald-950);
  --sidebar-ring: var(--color-emerald-500);
}

html[data-palette="amber"] {
  --primary: var(--color-amber-600);
  --primary-foreground: var(--color-amber-50);
  --ring: var(--color-amber-400);
  --sidebar-primary: var(--color-amber-600);
  --sidebar-primary-foreground: var(--color-amber-50);
  --sidebar-ring: var(--color-amber-400);
}
html[data-palette="amber"].dark {
  --primary: var(--color-amber-400);
  --primary-foreground: var(--color-amber-950);
  --ring: var(--color-amber-500);
  --sidebar-primary: var(--color-amber-400);
  --sidebar-primary-foreground: var(--color-amber-950);
  --sidebar-ring: var(--color-amber-500);
}

html[data-palette="violet"] {
  --primary: var(--color-violet-600);
  --primary-foreground: var(--color-violet-50);
  --ring: var(--color-violet-400);
  --sidebar-primary: var(--color-violet-600);
  --sidebar-primary-foreground: var(--color-violet-50);
  --sidebar-ring: var(--color-violet-400);
}
html[data-palette="violet"].dark {
  --primary: var(--color-violet-400);
  --primary-foreground: var(--color-violet-950);
  --ring: var(--color-violet-500);
  --sidebar-primary: var(--color-violet-400);
  --sidebar-primary-foreground: var(--color-violet-950);
  --sidebar-ring: var(--color-violet-500);
}
```

- [ ] **Step 2: Sanity-check in the browser later**

No typecheck for pure CSS. We'll verify in the smoke test that selectors apply. For now just make sure the edit didn't corrupt the existing blocks above it.

- [ ] **Step 3: Typecheck (quick)**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -5
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/styles.css
git commit -m "feat(ui): add per-palette css variable overrides"
```

---

## Task 11: First-paint inline scripts

**Files:**
- Modify: `apps/web-tanstack/src/routes/__root.tsx`
- Modify: `apps/web-next/app/layout.tsx`

Both apps inline a tiny script in `<head>` that applies the `.dark` class before React hydrates, to avoid flash. Extend it to also stamp `data-palette` so a palette choice doesn't flash either.

- [ ] **Step 1: web-tanstack**

Open `apps/web-tanstack/src/routes/__root.tsx`. Find the existing `ORBIT_THEME_HEAD_SCRIPT` string (single line). Replace the import and the constant:

```ts
import {
  ORBIT_THEME_PALETTE_STORAGE_KEY,
  ORBIT_THEME_STORAGE_KEY,
  ThemeProvider,
} from '@orbit/ui/theme-provider'

const ORBIT_THEME_HEAD_SCRIPT = `!function(){try{var k=${JSON.stringify(ORBIT_THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);var pk=${JSON.stringify(ORBIT_THEME_PALETTE_STORAGE_KEY)};var pal=localStorage.getItem(pk);if(!pal||!/^[a-z]+$/.test(pal))pal="graphite";document.documentElement.setAttribute("data-palette",pal);}catch(e){}}();`
```

(The `/^[a-z]+$/` guard prevents a malicious localStorage write from injecting a CSS selector. The ThemeProvider's `isOrbitThemePalette` is the canonical check, but the inline script needs to stay parser-free; a simple regex is enough to avoid garbage selectors.)

- [ ] **Step 2: web-next**

Open `apps/web-next/app/layout.tsx`. Update the import and the `THEME_HEAD_SCRIPT` constant identically:

```ts
import {
  ORBIT_THEME_PALETTE_STORAGE_KEY,
  ORBIT_THEME_STORAGE_KEY,
} from "@orbit/ui/theme-provider";

const THEME_HEAD_SCRIPT = `!function(){try{var k=${JSON.stringify(ORBIT_THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);var pk=${JSON.stringify(ORBIT_THEME_PALETTE_STORAGE_KEY)};var pal=localStorage.getItem(pk);if(!pal||!/^[a-z]+$/.test(pal))pal="graphite";document.documentElement.setAttribute("data-palette",pal);}catch(e){}}();`;
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web-tanstack/src/routes/__root.tsx apps/web-next/app/layout.tsx
git commit -m "feat: extend first-paint script to stamp data-palette"
```

---

## Task 12: Shared `<AppearancePicker />` component

**Files:**
- Create: `packages/ui/src/components/appearance-picker.tsx`

The picker component renders the two-row layout. It reads/writes through `useTheme()` and calls `onPersist` after each local update.

- [ ] **Step 1: Create the component**

Create `packages/ui/src/components/appearance-picker.tsx`:

```tsx
"use client";

import {
  ORBIT_THEME_MODES,
  type OrbitThemeMode,
  type OrbitThemePalette,
} from "@orbit/shared/themes";
import { PALETTES } from "../themes/palettes.ts";
import { useTheme, type OrbitThemePreference } from "./theme-provider.tsx";

export interface AppearancePickerProps {
  /**
   * Called after an optimistic local change with the field that
   * changed. Implementations should PATCH /v1/me/preferences. Errors
   * should be surfaced by the caller (toast / log) — the picker does
   * not attempt to revert on failure (by convention a failed
   * persistence is surfaced but UI stays on the user's chosen value
   * since the local cache is already consistent).
   */
  onPersist: (
    input:
      | { themeMode: OrbitThemeMode }
      | { themePalette: OrbitThemePalette },
  ) => void | Promise<void>;
}

const MODE_LABELS: Record<OrbitThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function AppearancePicker({ onPersist }: AppearancePickerProps) {
  const { preference, palette, setPreference, setPalette } = useTheme();

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Mode
        </div>
        <div className="grid max-w-xl grid-cols-3 gap-3">
          {ORBIT_THEME_MODES.map((m) => (
            <button
              key={m}
              type="button"
              data-selected={preference === m}
              onClick={() => {
                setPreference(m);
                void onPersist({ themeMode: m });
              }}
              className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[selected=true]:border-primary"
              aria-pressed={preference === m}
            >
              <ModePreviewCard mode={m} />
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span>{MODE_LABELS[m]}</span>
                {preference === m ? (
                  <span className="text-primary" aria-hidden>
                    ●
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Palette
        </div>
        <div className="grid max-w-xl grid-cols-3 gap-3">
          {Object.values(PALETTES).map((p) => (
            <button
              key={p.id}
              type="button"
              data-selected={palette === p.id}
              onClick={() => {
                setPalette(p.id);
                void onPersist({ themePalette: p.id });
              }}
              className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[selected=true]:border-primary"
              aria-pressed={palette === p.id}
            >
              <PalettePreviewCard paletteId={p.id} swatch={p.swatch} />
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="flex items-center gap-2">
                  {p.name}
                  {palette === p.id ? (
                    <span className="text-primary" aria-hidden>
                      ●
                    </span>
                  ) : null}
                </span>
                <span className="flex gap-1" aria-hidden>
                  <span
                    className="size-2 rounded-full"
                    style={{ background: p.swatch[0] }}
                  />
                  <span
                    className="size-2 rounded-full"
                    style={{ background: p.swatch[1] }}
                  />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModePreviewCard({ mode }: { mode: OrbitThemeMode }) {
  // Static miniature that represents light / dark / split. No live
  // rendering — keeps the card cheap and independent of the picker's
  // currently-applied mode.
  if (mode === "system") {
    return (
      <div
        aria-hidden
        className="h-[72px] w-full"
        style={{
          background:
            "linear-gradient(135deg, #fafafa 0 50%, #0a0a0a 50% 100%)",
        }}
      />
    );
  }
  if (mode === "light") {
    return (
      <div
        aria-hidden
        className="h-[72px] w-full bg-neutral-50"
      >
        <div className="mx-3 mt-3 h-1.5 w-10 rounded-full bg-neutral-300" />
        <div className="mx-3 mt-2 h-1.5 w-6 rounded-full bg-neutral-200" />
        <div className="mx-3 mt-3 h-5 rounded-md border border-neutral-200 bg-white" />
      </div>
    );
  }
  return (
    <div aria-hidden className="h-[72px] w-full bg-neutral-950">
      <div className="mx-3 mt-3 h-1.5 w-10 rounded-full bg-neutral-700" />
      <div className="mx-3 mt-2 h-1.5 w-6 rounded-full bg-neutral-800" />
      <div className="mx-3 mt-3 h-5 rounded-md border border-neutral-800 bg-neutral-900" />
    </div>
  );
}

function PalettePreviewCard({
  paletteId,
  swatch,
}: {
  paletteId: OrbitThemePalette;
  swatch: readonly [string, string];
}) {
  // Mini chrome: two accent strips + a solid button + an input
  // bar. Colors come from `swatch` so the preview is correct
  // regardless of whether the palette is currently applied to
  // <html>. (Isolating via a child data-palette attribute would
  // only work if we re-injected the same CSS blocks scoped to
  // [data-preview-palette] — overkill for six static previews.)
  return (
    <div
      aria-hidden
      className="flex h-[92px] w-full flex-col justify-between bg-neutral-950 p-3"
    >
      <div className="flex gap-1">
        <span
          className="h-1 flex-1 rounded-full"
          style={{ background: swatch[0] }}
        />
        <span
          className="h-1 flex-1 rounded-full"
          style={{ background: swatch[1] }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          className="flex h-4 w-7 items-center justify-center rounded-md text-[8px] font-semibold text-white"
          style={{ background: swatch[0] }}
        >
          Go
        </span>
        <span
          className="h-1.5 flex-1 rounded-full border"
          style={{ borderColor: swatch[1], background: "#18181b" }}
        />
      </div>
      <span className="sr-only">{paletteId}</span>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/appearance-picker.tsx
git commit -m "feat(ui): add AppearancePicker with mode + palette previews"
```

---

## Task 13: web-tanstack wiring — api client, mutation, page

**Files:**
- Modify: `apps/web-tanstack/src/lib/api/client.ts`
- Modify: `apps/web-tanstack/src/lib/mutations.ts`
- Modify: `apps/web-tanstack/src/pages/workspace-settings/appearance-page.tsx`
- Modify: `apps/web-tanstack/src/lib/queries/session.ts`

- [ ] **Step 1: Add the api call**

Open `apps/web-tanstack/src/lib/api/client.ts`. Add an import near the top for the shared types:

```ts
import type { OrbitThemeMode, OrbitThemePalette } from "@orbit/shared/themes";
```

Find `me: () => request<MeResponse>("/v1/me"),` inside the `api` object. Replace that one line with the nested-object shape so the existing method becomes `api.me.get()` and the new one lives at `api.me.updatePreferences(...)`. Search for existing call sites first — `sg -lang typescript -p 'api.me()' apps/web-tanstack/src` — and update them all.

Actually, to avoid touching every `api.me()` call, use a different naming: leave `api.me()` alone and add `api.updatePreferences` at the top level:

```ts
  me: () => request<MeResponse>("/v1/me"),

  updatePreferences: (body: {
    themeMode?: OrbitThemeMode | null;
    themePalette?: OrbitThemePalette | null;
  }) =>
    request<{
      themeMode: OrbitThemeMode | null;
      themePalette: OrbitThemePalette | null;
    }>("/v1/me/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
```

Insert this immediately after the `me:` line.

- [ ] **Step 2: Add the mutation hook**

Open `apps/web-tanstack/src/lib/mutations.ts`. Add the hook at the bottom (or near other me-related hooks):

```ts
export function useUpdatePreferencesMutation() {
  const queryClient = useOrbitQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updatePreferences>[0]) =>
      api.updatePreferences(body),
    onSuccess: (result) => {
      // Reconcile the cached /v1/me response so useSuspenseQuery
      // consumers see the authoritative server value on next render.
      queryClient.setQueryData(queryKeys.me(), (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        const me = prev as { user?: Record<string, unknown> };
        if (!me.user) return prev;
        return {
          ...me,
          user: {
            ...me.user,
            themeMode: result.themeMode,
            themePalette: result.themePalette,
          },
        };
      });
    },
  });
}
```

Make sure `api` is imported at the top of `mutations.ts` (it's already imported for the waitlist calls; check).

- [ ] **Step 3: Wire the page**

Open `apps/web-tanstack/src/pages/workspace-settings/appearance-page.tsx`. Replace its body:

```tsx
import { AppearancePicker } from "@orbit/ui/appearance-picker";
import { useUpdatePreferencesMutation } from "@/lib/mutations";
import { SettingsSection } from "@/pages/workspace-settings/shared";

export function WorkspaceAppearancePage() {
  const mutation = useUpdatePreferencesMutation();

  return (
    <div className="space-y-10">
      <SettingsSection
        title="Appearance"
        description="Customize how Orbit looks across your devices. Changes apply immediately."
      >
        <AppearancePicker
          onPersist={(input) => {
            mutation.mutate(input);
          }}
        />
      </SettingsSection>
    </div>
  );
}
```

- [ ] **Step 4: Legacy backfill**

Open `apps/web-tanstack/src/lib/queries/session.ts`. Add a fenced-free addition that fires a one-shot sync when the server has null prefs but localStorage has values. Inside `queryFn` after the `me` is fetched and before the demo-stamp block:

```ts
    if (typeof window !== "undefined") {
      const needsBackfillMode =
        me.user.themeMode == null && localStorage.getItem("orbit-theme");
      const needsBackfillPalette =
        me.user.themePalette == null &&
        localStorage.getItem("orbit-theme-palette");
      if (needsBackfillMode || needsBackfillPalette) {
        void api.updatePreferences({
          themeMode: needsBackfillMode
            ? (localStorage.getItem("orbit-theme") as
                | OrbitThemeMode
                | null) ?? null
            : undefined,
          themePalette: needsBackfillPalette
            ? (localStorage.getItem("orbit-theme-palette") as
                | OrbitThemePalette
                | null) ?? null
            : undefined,
        }).catch(() => {
          /* best-effort; next tick handles it */
        });
      }
    }
```

Add the matching imports at the top of `session.ts`:

```ts
import type { OrbitThemeMode, OrbitThemePalette } from "@orbit/shared/themes";
```

(If the file doesn't already import `api`, add it alongside the existing `import { api } from "@/lib/api/client";`.)

The `as OrbitThemeMode | null` cast is fine at the write boundary — the server validates and rejects anything unknown, so a stale localStorage value won't corrupt the row.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web-tanstack/src/lib/api/client.ts apps/web-tanstack/src/lib/mutations.ts apps/web-tanstack/src/pages/workspace-settings/appearance-page.tsx apps/web-tanstack/src/lib/queries/session.ts
git commit -m "feat(web-tanstack): wire appearance picker to PATCH /v1/me/preferences"
```

---

## Task 14: web-next wiring — mirror web-tanstack

**Files:**
- Modify: `apps/web-next/src/lib/api/client.ts`
- Modify: `apps/web-next/src/lib/mutations.ts`
- Modify: `apps/web-next/src/views/workspace-settings/appearance-page.tsx`
- Modify: `apps/web-next/src/lib/queries/session.ts` (or the file that owns the `/v1/me` query in the next app — confirm name by listing `apps/web-next/src/lib/queries/`)

Mirror Task 13 exactly. The next app's api client and mutation file have the same shape as the tanstack one.

- [ ] **Step 1: Add the api call**

Open `apps/web-next/src/lib/api/client.ts`. Mirror the Task 13 Step 1 edit: add the `updatePreferences` method to the `api` object.

- [ ] **Step 2: Add the mutation hook**

Open `apps/web-next/src/lib/mutations.ts`. Mirror the Task 13 Step 2 hook. If the next app uses a different query-client accessor (e.g. `useQueryClient()` directly rather than `useOrbitQueryClient()`), use the existing convention.

- [ ] **Step 3: Wire the page**

Open `apps/web-next/src/views/workspace-settings/appearance-page.tsx`. Replace its body:

```tsx
"use client";

import { AppearancePicker } from "@orbit/ui/appearance-picker";
import { useUpdatePreferencesMutation } from "@/lib/mutations";
import { SettingsSection } from "@/views/workspace-settings/shared";

export function WorkspaceAppearancePage() {
  const mutation = useUpdatePreferencesMutation();

  return (
    <div className="space-y-10">
      <SettingsSection
        title="Appearance"
        description="Customize how Orbit looks across your devices. Changes apply immediately."
      >
        <AppearancePicker
          onPersist={(input) => {
            mutation.mutate(input);
          }}
        />
      </SettingsSection>
    </div>
  );
}
```

- [ ] **Step 4: Legacy backfill**

Find the next app's `/v1/me` query file (most likely `apps/web-next/src/lib/queries/session.ts` or `.../me.ts`; grep `meQueryOptions` to confirm). Apply the Task 13 Step 4 edit to the next app's queryFn.

- [ ] **Step 5: Typecheck**

```bash
cd /Users/sean/personal/orbit && npm run typecheck 2>&1 | tail -10
```

Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web-next/src/lib/api/client.ts apps/web-next/src/lib/mutations.ts apps/web-next/src/views/workspace-settings/appearance-page.tsx apps/web-next/src/lib/queries/
git commit -m "feat(web-next): wire appearance picker to PATCH /v1/me/preferences"
```

---

## Task 15: End-to-end smoke

Manual verification. No code changes expected; fix any regressions in new small commits.

**Prereqs:**
- Postgres running, migrations applied (`npm run prisma:migrate`).
- Dev servers start with `npm run dev` (api :4002, web-tanstack :4001, web-next :4003, www :4000).

- [ ] **Step 1: Start dev + log in**

```bash
cd /Users/sean/personal/orbit && npm run dev
```

Sign in to web-tanstack (`http://localhost:4001`). Navigate to `/d/<workspace>/workspace/settings/appearance`.

Expected: two rows. Mode has 3 cards (Light, Dark, System). Palette has 6 cards (Graphite, Indigo, Crimson, Sage, Amber, Violet). The currently-applied selections are visibly marked.

- [ ] **Step 2: Click each palette**

Click Indigo. The app's primary accents (buttons, focus rings, sidebar primary chip) should shift blue immediately. DevTools → Application → Local Storage should show `orbit-theme-palette` = `"indigo"`. Network tab should show `PATCH /v1/me/preferences` 200.

Repeat for each palette. Confirm the picker updates live and the stored value persists.

- [ ] **Step 3: Reload — no flash**

With the Indigo palette active in dark mode, hard reload (⌘⇧R). Confirm the page paints once in indigo-dark without a flash through graphite or light mode.

- [ ] **Step 4: Second-device sync**

Open the same app in an incognito window, sign in as the same user. The picker should reflect the last-saved palette. Change to Violet in the incognito window; re-focus the original window and reload — it should also be Violet now.

- [ ] **Step 5: Mirror in web-next**

Navigate to the next app's settings (`http://localhost:4003/...appearance`). Confirm the picker renders identically and the already-set palette is selected. Change to Sage; confirm write + live apply.

- [ ] **Step 6: Legacy backfill**

In DevTools for web-tanstack, run:

```js
localStorage.setItem("orbit-theme", "dark");
localStorage.setItem("orbit-theme-palette", "amber");
```

Then, in a SQL shell:

```sql
UPDATE users SET "themeMode" = NULL, "themePalette" = NULL WHERE email = '<your email>';
```

Hard-reload. Expected: the next `/v1/me` fetch fires a `PATCH /v1/me/preferences` with the localStorage values, and a second `GET /v1/me` would now return `themeMode: "dark"`, `themePalette: "amber"`. Verify the row is updated:

```sql
SELECT "themeMode", "themePalette" FROM users WHERE email = '<your email>';
```

- [ ] **Step 7: API validation smoke**

From a terminal (replacing the cookie with one from DevTools):

```bash
curl -X PATCH http://localhost:4002/v1/me/preferences \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"themePalette":"neon"}'
```

Expected: 400 with a `validation` error code.

- [ ] **Step 8: Final typecheck + tests**

```bash
npm run typecheck
cd apps/api && npx vitest run
cd /Users/sean/personal/orbit && cd packages/shared && npx vitest run
```

Expected: all pass. api suite should be 3 (rate-limiter) + 7 (themes) + 5 (update-preferences) = 15 if shared tests are run via the api vitest, else separate counts.

- [ ] **Step 9: Commit smoke fixes (if any)**

If Steps 1-8 turned up regressions, commit targeted fixes here. Otherwise skip.

---

## Follow-ups (out of this plan)

- **Demo seeder stamp:** on the `feat/demo-mode` branch, in `apps/api/src/demo/infrastructure/demo-seeder.ts`, change the demo user `tx.raw.user.update` call so it also stamps `themePalette: "indigo"` inside the existing `+feature:demo` fence. This lands when the two branches meet (either via merge conflict resolution or as a small cleanup PR after both land).
- **Account settings shell:** separate brainstorm. Once it exists, move the Appearance panel from `/workspace/settings/appearance` to `/account/settings/appearance` (or mirror it). The picker component itself doesn't need to move — only the route wiring.
- **Density toggle:** separate brainstorm. Natural third axis alongside Mode + Palette on this page.

---

## Self-review (2026-04-24)

**Spec coverage.** Each numbered section of the spec maps to tasks:
- Decisions table → Tasks 1-14.
- Palette registry → Tasks 1-2.
- Schema → Task 3.
- Identity domain → Tasks 4-6.
- DTO + `/v1/me` → Task 7.
- `PATCH /v1/me/preferences` → Task 8.
- ThemeProvider extension → Task 9.
- CSS wiring → Task 10.
- First-paint script → Task 11.
- Shared picker → Task 12.
- Per-app wiring → Tasks 13-14.
- Legacy backfill → Tasks 13-14 (Step 4 in each).
- Testing → unit tests in Tasks 1, 6; integration + manual in Task 15.
- Risks section items 1-2 (Tailwind `@theme` + SSR hydration) are implicit in Tasks 9-11 and covered by Step 3 of the smoke test.

**Placeholder scan.** No "TBD", "TODO", or unsubstantiated "add appropriate X" phrases found.

**Type consistency.** `OrbitThemeMode` / `OrbitThemePalette` names used identically across Tasks 1-14. `updatePreferences` (aggregate method) / `UpdatePreferencesService` (application service) / `useUpdatePreferencesMutation` (hook) naming is consistent. `themeMode` / `themePalette` (camelCase) is the one field name used everywhere.

**Known friction.** Tasks 4 + 5 intentionally land in a single commit because Task 4 alone breaks the build. Task 11's regex-guard on the inline script is deliberately looser than the runtime validator — the inline script has no access to the TS validator and needs to stay parser-free.
