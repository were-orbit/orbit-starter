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
