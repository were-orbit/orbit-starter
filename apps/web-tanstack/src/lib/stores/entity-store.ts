import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";

/** Keyed map + `@tanstack/store`; new Map ref on each write for React deps. */
export class EntityStore<T> {
  readonly store: Store<Map<string, T>>;
  private readonly getKey: (item: T) => string;

  constructor(getKey: (item: T) => string, initial: T[] = []) {
    this.getKey = getKey;
    const map = new Map<string, T>();
    for (const it of initial) map.set(getKey(it), it);
    this.store = new Store(map);
  }

  get state(): ReadonlyMap<string, T> {
    return this.store.state;
  }

  get(id: string): T | undefined {
    return this.store.state.get(id);
  }

  has(id: string): boolean {
    return this.store.state.has(id);
  }

  values(): IterableIterator<T> {
    return this.store.state.values();
  }

  size(): number {
    return this.store.state.size;
  }

  insert(item: T | T[]): void {
    this.store.setState((prev) => {
      const next = new Map(prev);
      if (Array.isArray(item)) {
        for (const it of item) next.set(this.getKey(it), it);
      } else {
        next.set(this.getKey(item), item);
      }
      return next;
    });
  }

  update(id: string, updater: (draft: T) => void | T): void {
    this.store.setState((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const draft = { ...existing } as T;
      const returned = updater(draft);
      const next = new Map(prev);
      next.set(id, (returned as T) ?? draft);
      return next;
    });
  }

  delete(id: string): void {
    this.store.setState((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  replaceAll(items: T[]): void {
    this.store.setState(() => {
      const next = new Map<string, T>();
      for (const it of items) next.set(this.getKey(it), it);
      return next;
    });
  }

  clear(): void {
    this.store.setState((prev) => (prev.size === 0 ? prev : new Map()));
  }
}

export function useEntityMap<T>(entity: EntityStore<T>): ReadonlyMap<string, T> {
  return useStore(entity.store, (s) => s);
}
