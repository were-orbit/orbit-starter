/** Opt-in TanStack Query + Router devtools (`VITE_TANSTACK_DEVTOOLS=1` in env). */
export function isTanstackDevtoolsEnabled(): boolean {
  return import.meta.env.VITE_TANSTACK_DEVTOOLS === "1";
}
