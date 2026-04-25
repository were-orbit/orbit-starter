import { liteClient } from "algoliasearch/lite";
import {
  Command,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
} from "@orbit/ui/command";
import { Kbd } from "@orbit/ui/kbd";
import { useRouter } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID as string | undefined;
const API_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY as string | undefined;
const INDEX_NAME = import.meta.env.VITE_ALGOLIA_INDEX_NAME as
  | string
  | undefined;

type HierarchyLevel =
  | "lvl0"
  | "lvl1"
  | "lvl2"
  | "lvl3"
  | "lvl4"
  | "lvl5"
  | "lvl6";

type Hierarchy = Partial<Record<HierarchyLevel, string | null>>;

type Hit = {
  objectID: string;
  url: string;
  hierarchy: Hierarchy;
  content?: string | null;
};

const HIERARCHY_ORDER: HierarchyLevel[] = [
  "lvl6",
  "lvl5",
  "lvl4",
  "lvl3",
  "lvl2",
  "lvl1",
  "lvl0",
];

function hitTitle(hit: Hit): string {
  for (const key of HIERARCHY_ORDER) {
    const value = hit.hierarchy[key];
    if (value) return value;
  }
  return hit.url;
}

function hitBreadcrumb(hit: Hit, title: string): string | null {
  const trail = (["lvl0", "lvl1", "lvl2", "lvl3", "lvl4", "lvl5"] as const)
    .map((k) => hit.hierarchy[k])
    .filter((v): v is string => !!v && v !== title);
  return trail.length > 0 ? trail.join(" › ") : null;
}

function toInternalPath(href: string): string | null {
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    const url = new URL(href, origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function DocsSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  const client = useMemo(() => {
    if (!APP_ID || !API_KEY) return null;
    return liteClient(APP_ID, API_KEY);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!client || !INDEX_NAME) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      return;
    }
    let cancelled = false;
    client
      .search<Hit>({
        requests: [{ indexName: INDEX_NAME, query: trimmed, hitsPerPage: 8 }],
      })
      .then((res) => {
        if (cancelled) return;
        const first = res.results[0];
        if (first && "hits" in first) setHits(first.hits as Hit[]);
        else setHits([]);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [client, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const hit of hits) {
      const key = hit.hierarchy.lvl0 ?? "Documentation";
      const existing = map.get(key);
      if (existing) existing.push(hit);
      else map.set(key, [hit]);
    }
    return Array.from(map.entries());
  }, [hits]);

  if (!APP_ID || !API_KEY || !INDEX_NAME) return null;

  function select(hit: Hit) {
    const path = toInternalPath(hit.url);
    setOpen(false);
    setQuery("");
    if (path) router.history.push(path);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the docs"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-background/40 px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <SearchIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>Search docs</span>
        <Kbd className="ml-4 h-4 bg-transparent text-[10px] tracking-[0.15em]">
          ⌘K
        </Kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandDialogPopup>
          <Command
            mode="none"
            items={hits}
            value={query}
            onValueChange={(next) => setQuery(next)}
          >
            <CommandPanel>
              <CommandInput placeholder="Search the docs…" />
            </CommandPanel>
            <CommandList>
              {query.trim() !== "" && hits.length === 0 && (
                <CommandEmpty>No matches for "{query.trim()}".</CommandEmpty>
              )}
              {grouped.map(([group, items]) => (
                <CommandGroup key={group}>
                  <CommandGroupLabel>{group}</CommandGroupLabel>
                  {items.map((hit) => {
                    const title = hitTitle(hit);
                    const crumb = hitBreadcrumb(hit, title);
                    return (
                      <CommandItem
                        key={hit.objectID}
                        value={hit}
                        onClick={() => select(hit)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-foreground">
                            {title}
                          </span>
                          {crumb && (
                            <span className="truncate text-muted-foreground text-xs">
                              {crumb}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </CommandDialogPopup>
      </CommandDialog>
    </>
  );
}
