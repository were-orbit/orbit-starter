import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OrmChoice = "prisma" | "drizzle";

const DEFAULT_ORM: OrmChoice = "prisma";
const STORAGE_KEY = "orbit:orm-pref";
const EVENT_NAME = "orbit:orm-pref-change";

interface OrmContextValue {
  orm: OrmChoice;
  setOrm: (next: OrmChoice) => void;
}

const OrmContext = createContext<OrmContextValue>({
  orm: DEFAULT_ORM,
  setOrm: () => {},
});

/**
 * Provides a persistent ORM preference to the docs tree. Reads
 * `localStorage` on mount so repeat visitors land on their previous
 * choice, syncs across browser tabs via the `storage` event, and
 * syncs across sibling `OrmTabs` on the same page via a custom
 * `orbit:orm-pref-change` event (since the `storage` event does not
 * fire in the window that wrote the value).
 *
 * SSR: initial render is the default track (`prisma`); the client
 * hydrates with the stored preference if any. A brief mismatch on
 * first paint is acceptable — the site is a marketing / docs tree
 * and the default matches what 99% of visitors want.
 */
export function OrmProvider({ children }: { children: ReactNode }) {
  const [orm, setOrmState] = useState<OrmChoice>(DEFAULT_ORM);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "prisma" || stored === "drizzle") {
        setOrmState(stored);
      }
    } catch {
      // localStorage disabled (privacy mode, SSR rehydration race) —
      // stick with the default. The `OrmTabs` UI still works without
      // persistence; only the cross-page memory feature is lost.
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === "prisma" || event.newValue === "drizzle") {
        setOrmState(event.newValue);
      }
    };
    const onLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<OrmChoice>).detail;
      if (detail === "prisma" || detail === "drizzle") {
        setOrmState(detail);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onLocalChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onLocalChange as EventListener);
    };
  }, []);

  const setOrm = useCallback((next: OrmChoice) => {
    setOrmState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal; the tab still switches in-page.
    }
    try {
      window.dispatchEvent(
        new CustomEvent<OrmChoice>(EVENT_NAME, { detail: next }),
      );
    } catch {
      // Ignore if CustomEvent isn't available — e.g. some very old
      // browsers, or a prerender context where `window` is a shim.
    }
  }, []);

  const value = useMemo(() => ({ orm, setOrm }), [orm, setOrm]);
  return <OrmContext.Provider value={value}>{children}</OrmContext.Provider>;
}

export function useOrmPref(): OrmChoice {
  return useContext(OrmContext).orm;
}

/**
 * Tabbed switcher between a Prisma and a Drizzle variant of the same
 * content. Clicking a tab updates the shared preference so every
 * other `OrmTabs` on the page — and on future page visits — shows
 * the same track.
 */
export function OrmTabs({
  prisma,
  drizzle,
}: {
  prisma: ReactNode;
  drizzle: ReactNode;
}) {
  const { orm, setOrm } = useContext(OrmContext);
  return (
    <div className="mt-5 rounded-lg border border-border/60 bg-card/20 not-dark:bg-clip-padding">
      <div
        role="tablist"
        aria-label="Pick an ORM"
        className="flex items-center gap-1 border-b border-border/60 p-1.5"
      >
        <OrmTabButton
          label="Prisma"
          value="prisma"
          active={orm === "prisma"}
          onClick={() => setOrm("prisma")}
        />
        <OrmTabButton
          label="Drizzle"
          value="drizzle"
          active={orm === "drizzle"}
          onClick={() => setOrm("drizzle")}
        />
        <span className="ml-auto pr-2 text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          ORM
        </span>
      </div>
      <div
        role="tabpanel"
        aria-labelledby={`orm-tab-${orm}`}
        className="px-4 pt-1 pb-4"
      >
        {orm === "prisma" ? prisma : drizzle}
      </div>
    </div>
  );
}

function OrmTabButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: OrmChoice;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={`orm-tab-${value}`}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`orm-panel-${value}`}
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-accent/60 px-3 py-1.5 text-[11px] text-foreground uppercase tracking-[0.25em]"
          : "rounded-md px-3 py-1.5 text-[11px] text-muted-foreground uppercase tracking-[0.25em] transition-colors hover:bg-accent/20 hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}

/**
 * Inline helper for short phrases that differ between ORMs. Picks the
 * active variant from context.
 *
 *     <OrmInline prisma="prisma migrate" drizzle="drizzle-kit migrate" />
 */
export function OrmInline({
  prisma,
  drizzle,
}: {
  prisma: ReactNode;
  drizzle: ReactNode;
}) {
  const orm = useOrmPref();
  return <>{orm === "prisma" ? prisma : drizzle}</>;
}
