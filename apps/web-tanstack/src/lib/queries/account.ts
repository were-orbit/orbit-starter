import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export interface BlockingOwnedWorkspace {
  id: string;
  name: string;
  slug: string;
}

export const blockingOwnedWorkspacesQueryOptions = {
  queryKey: queryKeys.accountBlockingWorkspaces(),
  queryFn: () => api.account.ownedWorkspacesBlockingDelete(),
} as const;
