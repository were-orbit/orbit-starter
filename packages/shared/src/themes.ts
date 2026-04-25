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
