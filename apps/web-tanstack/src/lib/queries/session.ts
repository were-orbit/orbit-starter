import type { OrbitThemeMode, OrbitThemePalette } from "@orbit/shared/themes";
import type { MeResponse } from "@/lib/api/client";
import { api } from "@/lib/api/client";
import { getMeOnServer } from "@/lib/api/server-fns";
import { queryKeys } from "@/lib/query-keys";

/** `/v1/me` — SSR uses `getMeOnServer` for cookies; client calls `api.me()`. */
export const meQueryOptions = {
  queryKey: queryKeys.me(),
  queryFn: async (): Promise<MeResponse> => {
    const me =
      typeof window === "undefined" ? await getMeOnServer() : await api.me();
    if (typeof window !== "undefined") {
      const needsBackfillMode =
        me.user.themeMode == null && localStorage.getItem("orbit-theme");
      const needsBackfillPalette =
        me.user.themePalette == null &&
        localStorage.getItem("orbit-theme-palette");
      if (needsBackfillMode || needsBackfillPalette) {
        void api
          .updatePreferences({
            themeMode: needsBackfillMode
              ? ((localStorage.getItem("orbit-theme") as
                  | OrbitThemeMode
                  | null) ?? null)
              : undefined,
            themePalette: needsBackfillPalette
              ? ((localStorage.getItem("orbit-theme-palette") as
                  | OrbitThemePalette
                  | null) ?? null)
              : undefined,
          })
          .catch(() => {
            /* best-effort; next tick handles it */
          });
      }
    }
    return me;
  },
  staleTime: 60_000,
} as const;
