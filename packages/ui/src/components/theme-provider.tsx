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
