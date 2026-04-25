import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest config. We only need one thing that tsc gets "for free" via
 * `paths` in `tsconfig.json`: the `@/*` alias. Without this, unit tests
 * that touch anything under `src/` fail to resolve their own imports
 * (the code uses `@/kernel/...` internally).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Default run stays unit-only. Integration specs need a Postgres
    // container and live behind `npm run test:integration` — see
    // `vitest.integration.config.ts`.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
  },
});
