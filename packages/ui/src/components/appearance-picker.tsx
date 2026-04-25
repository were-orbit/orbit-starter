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

/**
 * Neutral surface tokens used by the miniature app chrome shown in
 * each preview card. Raw hexes rather than CSS vars so each card
 * can render in a *specific* scheme regardless of what's currently
 * applied to `<html>` — the palette cards respect the user's
 * currently-resolved mode, the mode cards show their own scheme.
 */
const SURFACES = {
  light: {
    bg: "#fafafa",
    sidebar: "#f4f4f5",
    sidebarBorder: "#e4e4e7",
    card: "#ffffff",
    border: "#e4e4e7",
    muted: "#d4d4d8",
    mutedSoft: "#e4e4e7",
  },
  dark: {
    bg: "#0a0a0a",
    sidebar: "#101012",
    sidebarBorder: "#27272a",
    card: "#141416",
    border: "#27272a",
    muted: "#3f3f46",
    mutedSoft: "#27272a",
  },
} as const;

type Scheme = keyof typeof SURFACES;

export function AppearancePicker({ onPersist }: AppearancePickerProps) {
  const { preference, palette, setPreference, setPalette, resolved } =
    useTheme();

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
              <ModePreviewCard mode={m} accent={PALETTES[palette].swatch[0]} />
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
              <MiniAppChrome
                scheme={resolved}
                accent={p.swatch[0]}
                accentSoft={p.swatch[1]}
              />
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

/**
 * Mode preview. Renders the mini-app in its own scheme (light card
 * → light chrome, dark card → dark chrome, system card → split).
 * Uses the user's currently-selected palette accent so the preview
 * feels personal instead of a generic neutral.
 */
function ModePreviewCard({
  mode,
  accent,
}: {
  mode: OrbitThemeMode;
  accent: string;
}) {
  if (mode === "system") {
    return (
      <div aria-hidden className="relative h-[108px] w-full overflow-hidden">
        <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}>
          <MiniAppChrome scheme="light" accent={accent} accentSoft={accent} />
        </div>
        <div className="absolute inset-0" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}>
          <MiniAppChrome scheme="dark" accent={accent} accentSoft={accent} />
        </div>
      </div>
    );
  }
  return <MiniAppChrome scheme={mode} accent={accent} accentSoft={accent} />;
}

/**
 * Miniature Orbit app chrome: left rail with workspace dot + two
 * dim items + one accent-highlighted active item, main area with a
 * card containing a title row, a body line, and a primary button.
 * Uses `scheme` to pick neutral surfaces and `accent` / `accentSoft`
 * for the palette's primary + softer variant.
 */
function MiniAppChrome({
  scheme,
  accent,
  accentSoft,
}: {
  scheme: Scheme;
  accent: string;
  accentSoft: string;
}) {
  const s = SURFACES[scheme];
  return (
    <div
      aria-hidden
      className="flex h-[108px] w-full"
      style={{ background: s.bg }}
    >
      {/* Rail */}
      <div
        className="flex w-[26px] flex-col items-center gap-2 border-r py-2"
        style={{ background: s.sidebar, borderColor: s.sidebarBorder }}
      >
        <span
          className="size-3 rounded-md"
          style={{ background: accent }}
        />
        <span
          className="mt-1 size-2 rounded-sm"
          style={{ background: s.muted }}
        />
        <span
          className="size-2 rounded-sm"
          style={{ background: accentSoft, opacity: 0.75 }}
        />
        <span
          className="size-2 rounded-sm"
          style={{ background: s.mutedSoft }}
        />
      </div>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
        {/* Title row */}
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-14 rounded-full"
            style={{ background: s.muted }}
          />
          <span
            className="ml-auto h-1.5 w-5 rounded-full"
            style={{ background: s.mutedSoft }}
          />
        </div>

        {/* Card */}
        <div
          className="flex flex-1 flex-col justify-between rounded-md border p-2"
          style={{ background: s.card, borderColor: s.border }}
        >
          <div className="flex flex-col gap-1">
            <span
              className="h-1 w-16 rounded-full"
              style={{ background: s.muted }}
            />
            <span
              className="h-1 w-10 rounded-full"
              style={{ background: s.mutedSoft }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="flex h-3.5 items-center justify-center rounded px-1.5 text-[7px] font-semibold text-white"
              style={{ background: accent }}
            >
              Go
            </span>
            <span
              className="h-1 flex-1 rounded-full"
              style={{ background: accentSoft, opacity: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
