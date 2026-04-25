import { useRouteContext } from "@tanstack/react-router";
import type { OrbitRouterContext } from "@/lib/router-context";

/**
 * TanStack Router root `context.queryClient` (same instance as `QueryClientProvider`).
 * Prefer this over importing `@/lib/query-client` inside route-mounted components and hooks.
 */
export function useOrbitQueryClient(): OrbitRouterContext["queryClient"] {
  const ctx = useRouteContext({ strict: false }) as OrbitRouterContext;
  return ctx.queryClient;
}
