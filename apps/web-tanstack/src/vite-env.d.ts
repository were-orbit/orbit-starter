/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to `1` to show TanStack Query + Router devtools in dev. */
  readonly VITE_TANSTACK_DEVTOOLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
