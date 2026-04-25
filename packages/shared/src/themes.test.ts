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
