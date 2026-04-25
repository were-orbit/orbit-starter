# Theme Picker — Design

**Date:** 2026-04-24
**Status:** Approved, pre-implementation
**Scope:** Replace the `/settings/appearance` stub in both `apps/web-tanstack`
and `apps/web-next` with a real picker (Mode + Palette). Adds the first
user-level preference surface on the API.

## Problem

Both authenticated apps have an `/settings/appearance` page that's a
"coming soon" stub. We want a polished two-axis picker: **Mode**
(light / dark / system) and **Palette** (Graphite / Indigo / Crimson
/ Sage / Amber / Violet). Preference is per-user, synced to the
server, and first-paint-flash free on reload.

This is also the first user-level preference stored on the server —
it sets the template for future `PATCH /v1/me/preferences` keys
(density, default workspace, language, etc.) without having to
re-architect.

## Non-goals

- Not fenced — this is a base product capability, not a strippable
  feature.
- No density toggle. Can be added to the same picker later.
- No custom / bring-your-own palettes. Fixed set of 6.
- No per-workspace themes. Preference is per-user.
- No account-settings surface. The picker lives on the
  workspace-settings shell's Appearance tab, same URL as today. When
  a proper `/account/settings/*` section lands later, the picker
  moves; for now it stays where the user expects it.

## Decisions

| Decision                   | Choice                                                                 |
|----------------------------|------------------------------------------------------------------------|
| Theme scope                | Light / dark / system **plus** 6-palette color set                     |
| Palette set                | Graphite · Indigo · Crimson · Sage · Amber · Violet                    |
| Storage scope              | Per-user, synced to the server (`User.themeMode` + `User.themePalette`)|
| Local cache                | `orbit-theme` (existing) + new `orbit-theme-palette` in localStorage   |
| Picker UX                  | Two rows (Mode row + Palette row), instant apply, no Save button       |
| Preview graphics           | Miniature app-chrome per card (accent strip + button + input)          |
| Mirroring                  | Both `web-tanstack` and `web-next`; shared component in `packages/ui`  |
| Validation                 | Strings (not Prisma enums) + runtime union in `@orbit/shared`          |

## Architecture

### Shared component in `packages/ui`

`<AppearancePicker onPersist={...} />` renders the full two-row
layout. It reads and writes through the existing `ThemeProvider`
(extended with palette state) and calls `onPersist` for the remote
mutation. Both apps import it unchanged — no logic duplication.

### Palette registry

```ts
// packages/ui/src/themes/palettes.ts
export const PALETTES = {
  graphite: { name: "Graphite", light: { "--primary": "...", ... }, dark: { ... } },
  indigo:   { name: "Indigo",   light: { ... }, dark: { ... } },
  crimson:  { ... },
  sage:     { ... },
  amber:    { ... },
  violet:   { ... },
} as const;

export type OrbitThemePalette = keyof typeof PALETTES;
```

Each entry defines CSS variable overrides for the accent tokens
(`--primary`, `--accent`, `--ring`, `--sidebar-accent`). Base
neutrals (`--background`, `--foreground`, `--border`) stay untouched
and come from the existing theme tokens.

The palette id union is mirrored in `@orbit/shared` as
`ORBIT_THEME_PALETTES` so the API can validate incoming strings
against the same list without depending on `packages/ui`.

### CSS wiring (`packages/ui/src/styles.css`)

Base `@theme` tokens stay as-is. A new block applies palette
overrides based on `html[data-palette="<id>"]` and combines with
the existing `.dark` class:

```css
html[data-palette="indigo"] {
  --primary: oklch(...);
  /* ... light-mode accent overrides ... */
}
html[data-palette="indigo"].dark {
  --primary: oklch(...);
  /* ... dark-mode accent overrides ... */
}
/* ... one block per palette × mode ... */
```

### `ThemeProvider` (extended)

Add `palette` to the context shape:

```ts
type ThemeContextValue = {
  preference: OrbitThemePreference;      // existing
  resolved:   "light" | "dark";          // existing
  palette:    OrbitThemePalette;         // NEW
  setPreference: (p: OrbitThemePreference) => void;
  setPalette:    (p: OrbitThemePalette) => void;
  toggleLightDark: () => void;
};
```

New `useEffect` writes `data-palette="<id>"` onto
`document.documentElement` and `orbit-theme-palette` to
`localStorage`.

### First-paint script

Each app's root HTML already inlines a tiny script that applies
`.dark` before React hydrates. Extend it to also read
`orbit-theme-palette` and stamp `data-palette` on `<html>`. Zero
FOUC on reload.

```html
<script>
  (function() {
    try {
      var m = localStorage.getItem("orbit-theme") || "system";
      var resolved = m === "system"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : m;
      if (resolved === "dark") document.documentElement.classList.add("dark");
      var p = localStorage.getItem("orbit-theme-palette") || "graphite";
      document.documentElement.setAttribute("data-palette", p);
    } catch (e) {}
  })();
</script>
```

### Sync flow

1. Inline script applies localStorage values.
2. React mounts; `ThemeProvider` seeds state from localStorage.
3. `/v1/me` returns `{ themeMode, themePalette }`. If they differ
   from localStorage, server wins — update state + localStorage +
   DOM.
4. User clicks a palette card: optimistic local update (DOM +
   localStorage), fires `PATCH /v1/me/preferences`. On failure,
   revert + toast.
5. **Legacy-user backfill:** on first `/v1/me` load after this ships,
   if server is `null` but localStorage has a value, the client
   fires a one-shot `PATCH` to sync its local pref up. Existing
   users' saved light/dark choice lands on the server without a
   prompt.

## Schema

```prisma
model User {
  // ... existing fields ...
  themeMode     String?
  themePalette  String?
}
```

Both nullable. `null` falls back to app defaults
(`themeMode → "system"`, `themePalette → "graphite"`) in both the
DTO mapper and the client.

Single migration: `prisma migrate dev --name add_user_theme_prefs`.
No backfill needed.

## Domain

### Aggregate extension

`User` aggregate gains:

```ts
get themeMode(): OrbitThemeMode | null { ... }
get themePalette(): OrbitThemePalette | null { ... }

updatePreferences(input: {
  themeMode?: OrbitThemeMode | null;
  themePalette?: OrbitThemePalette | null;
}): void
```

Only fields **explicitly passed** are changed. Passing `null`
explicitly clears to default. Passing `undefined` or omitting the
field leaves existing values untouched.

Emits `UserPreferencesUpdated` domain event (for future audit /
activity uses; no current subscribers).

### `UpdatePreferencesService`

```ts
// apps/api/src/identity/application/update-preferences.service.ts
class UpdatePreferencesService {
  constructor(private uow: UnitOfWork) {}

  async execute(cmd: {
    userId: UserId;
    themeMode?: OrbitThemeMode | null;
    themePalette?: OrbitThemePalette | null;
  }): Promise<User> {
    // Validate strings against ORBIT_THEME_MODES / ORBIT_THEME_PALETTES
    // (throws ValidationError on unknown). Load user, call
    // updatePreferences, save inside uow.
  }
}
```

Wired through `identityFeature.services` in `apps/api/src/identity/feature.ts`.

## API surface

### `PATCH /v1/me/preferences`

New controller at `apps/api/src/interfaces/http/controllers/me.preferences.controller.ts`, mounted at `/v1/me/preferences` alongside `/v1/me`.

Request body (all fields optional; only provided fields are updated):

```json
{
  "themeMode": "light" | "dark" | "system" | null,
  "themePalette": "graphite" | "indigo" | "crimson" | "sage" | "amber" | "violet" | null
}
```

- Missing field: leave existing value untouched.
- Explicit `null`: clear to default.
- Unknown enum value: 400 `ValidationError`.

Response: 200 with the updated slice.

```json
{ "themeMode": "dark", "themePalette": "indigo" }
```

Session middleware covers auth. Demo users are permitted to update
their own preferences (persistence until cleanup sweeps them is
fine).

### `/v1/me` extension

Add `themeMode: OrbitThemeMode | null` and `themePalette: OrbitThemePalette | null` to `UserDTO` in `packages/shared/src/dto.ts`. `userToDTO` in `apps/api/src/interfaces/mappers.ts` reads the new aggregate getters directly — no separate raw query needed.

## Frontend

### Route files (thin wrappers)

**`apps/web-tanstack/src/pages/workspace-settings/appearance-page.tsx`:**

```tsx
import { AppearancePicker } from "@orbit/ui/appearance-picker";
import { useUpdatePreferencesMutation } from "@/lib/mutations";

export function WorkspaceAppearancePage() {
  const mutate = useUpdatePreferencesMutation();
  return (
    <div className="space-y-10">
      <AppearancePicker onPersist={mutate} />
    </div>
  );
}
```

**`apps/web-next/src/views/workspace-settings/appearance-page.tsx`:** identical shape with the next app's mutation hook.

### `<AppearancePicker />` contract

```ts
interface AppearancePickerProps {
  onPersist: (input: {
    themeMode?: OrbitThemeMode;
    themePalette?: OrbitThemePalette;
  }) => void | Promise<void>;
}
```

- Reads `preference` + `palette` from `useTheme()`.
- Renders Mode row (3 cards) + Palette row (6 cards), each with the miniature app-chrome preview per the approved mockup.
- On click: calls `setPreference(x)` or `setPalette(x)` (updates DOM + localStorage optimistically), then awaits `onPersist({...})`.
- Leaves the mutation / toast concerns to the caller — keeps the component free of TanStack Query / toast library coupling.

### Mini-chrome preview cards

Each card is a fixed-size block with:
- Two accent strips (primary + secondary accent) at the top.
- A small solid button in the accent color.
- An input row (bordered rectangle).

No React state inside cards — they're purely presentational, styled with the palette's CSS vars scoped to the card via a `data-preview-palette` attribute on a local wrapper.

### Demo seeder hook

In `apps/api/src/demo/infrastructure/demo-seeder.ts`, inside the existing `+feature:demo` file fence, stamp `themePalette: "indigo"` on the demo user's row (via the existing `tx.raw.user.update` call site). One line. Makes the demo visually distinctive.

## Testing

### Unit (`apps/api`, vitest)

- `update-preferences.service.test.ts`:
  - Valid mode + palette → user saved with new values.
  - Invalid enum string → `ValidationError`.
  - Explicit `null` → field cleared.
  - Missing field → untouched.
- `mappers.test.ts` (new or appended):
  - Null aggregate fields → DTO returns `null`.
  - Populated → DTO returns stored values.

### Integration

- `PATCH /v1/me/preferences` round-trips:
  - Invalid body → 400.
  - Valid body → 200 + `GET /v1/me` reflects the update.
  - No session → 401.

### Frontend

No dedicated tests. The palette registry is a static const, the picker is presentational, and the flow is covered by the manual smoke.

### Manual smoke

- Click each palette. Reload. Verify the palette persists.
- Open in a second browser (new session) — palette synced.
- Existing user with prior light/dark preference (localStorage only): first `/v1/me` after deploy triggers a one-shot `PATCH` backfilling the server.
- Demo user: workspace loads on Indigo.

## Risks / open items

1. **Tailwind v4 `@theme` vs arbitrary `html[data-palette="x"]` overrides.** Tailwind 4 reads `@theme` at build time for the base tokens. Dynamic palette overrides via `html[data-palette=...]` blocks work at runtime because they're plain CSS cascading on top of the compiled utilities. Verify at implementation time — if `@theme` generates utilities that hard-bake the default palette's values (rather than referencing the CSS variables), we'll need to ensure the utilities read through `var(--primary)` etc. Low likelihood; the existing light/dark pattern already relies on this.

2. **`next` SSR hydration mismatch.** The inline script writes `data-palette` before hydration; React must render the page with the same attr. Solved today for `.dark` with the same pattern — replicate for `data-palette`.

3. **Palette registry grows unbounded over time.** 6 is the starting set; picker layout is a 3-column grid that scales to ~9 before re-layout is needed. Beyond that, a search/filter UX would be warranted — out of scope for this cut.

4. **Removing a palette in the future.** Users with a stored id that no longer exists fall back to "graphite" display; next write heals. Document in the registry module as a "prefer deprecating with a rename over deleting" note.

## Out of scope

- Account-settings shell (separate spec).
- Density toggle.
- Custom / user-authored palettes.
- Per-workspace theming.
- Email / invite templates inheriting the palette.
