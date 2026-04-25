import type { QueryClient } from "@tanstack/react-query";

/** Passed through TanStack Router `context` (see `getRouter` and `createRootRouteWithContext`). */
export type OrbitRouterContext = {
  queryClient: QueryClient;
};
