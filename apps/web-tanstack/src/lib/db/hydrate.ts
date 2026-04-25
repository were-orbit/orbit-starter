import type { QueryClient } from "@tanstack/react-query";
import { api, type WorkspaceSnapshot } from "@/lib/api/client";
import { getWorkspaceSnapshotOnServer } from "@/lib/api/server-fns";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { appStateStore, resetAppState, updateAppState } from "@/lib/stores/app-state";
import {
  invitesStore,
  membersStore,
  // +feature:realtime
  presenceStore,
  // -feature:realtime
  rolesStore,
} from "@/lib/stores/workspace-stores";

/** SSR: server fn forwards cookies; client: direct API. */
export async function fetchWorkspaceSnapshot(slug: string): Promise<WorkspaceSnapshot> {
  return typeof window === "undefined"
    ? getWorkspaceSnapshotOnServer({ data: slug })
    : api.workspaces.get(slug);
}

/** Writes a fetched workspace snapshot into the entity stores. */
export function applyWorkspaceSnapshot(snapshot: WorkspaceSnapshot): void {
  updateAppState((draft) => {
    draft.currentWorkspace = snapshot.workspace;
    draft.currentMemberId = snapshot.you?.id ?? null;
  });
  membersStore.replaceAll(snapshot.members);
}

/** `GET /v1/workspaces/:slug` */
export function workspaceSnapshotQueryOptions(slug: string) {
  return {
    queryKey: queryKeys.workspaceSnapshot(slug),
    queryFn: () => fetchWorkspaceSnapshot(slug),
    staleTime: 0,
  };
}

export function peekWorkspaceSnapshotForSlug(
  slug: string,
  qc: Pick<QueryClient, "getQueryData">,
): WorkspaceSnapshot | null {
  const cached = qc.getQueryData<WorkspaceSnapshot>(queryKeys.workspaceSnapshot(slug));
  return cached?.workspace.slug === slug ? cached : null;
}

export async function getWorkspaceSnapshotForSlug(
  slug: string,
  qc: QueryClient,
): Promise<WorkspaceSnapshot> {
  const peeked = peekWorkspaceSnapshotForSlug(slug, qc);
  if (peeked) return peeked;
  return qc.ensureQueryData(workspaceSnapshotQueryOptions(slug));
}

export async function hydrateWorkspace(slug: string): Promise<WorkspaceSnapshot> {
  const snapshot = await queryClient.fetchQuery(workspaceSnapshotQueryOptions(slug));
  applyWorkspaceSnapshot(snapshot);
  return snapshot;
}

/** Clears all workspace-scoped entity stores and TanStack cache. */
export function clearWorkspaceState(): void {
  queryClient.removeQueries({ queryKey: queryKeys.workspace() });
  membersStore.clear();
  rolesStore.clear();
  invitesStore.clear();
  // +feature:realtime
  presenceStore.clear();
  // -feature:realtime
  resetAppState();
}

/**
 * Called on workspace switch. Keeps `currentUser` intact but drops any
 * workspace-scoped state that would be stale under the new slug.
 */
export function clearStaleWorkspaceEntities(): void {
  membersStore.clear();
  rolesStore.clear();
  invitesStore.clear();
  // +feature:realtime
  presenceStore.clear();
  // -feature:realtime
  updateAppState((draft) => {
    draft.currentWorkspace = null;
    draft.currentMemberId = null;
  });
  void appStateStore;
}
