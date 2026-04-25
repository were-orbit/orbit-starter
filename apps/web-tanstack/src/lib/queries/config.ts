import type { RuntimeConfigDTO } from "@orbit/shared/dto";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

/**
 * `/v1/config` — public runtime flags. Treated as mostly-static: the
 * waitlist toggle only changes on deploy, so we keep it in cache for the
 * whole session and never auto-refetch. Fetched lazily on the first
 * screen that branches on it (onboarding, request-access).
 */
export const configQueryOptions = {
  queryKey: queryKeys.config(),
  queryFn: (): Promise<RuntimeConfigDTO> => api.config(),
  staleTime: Infinity,
  gcTime: Infinity,
} as const;
