import { useMemo } from "react";
import type {
  WorkspaceMemberDTO,
  WorkspaceMemberId,
  WorkspaceRoleDTO,
  WorkspaceRoleId,
} from "@orbit/shared/dto";
import { api, ApiError, type MeResponse, type WorkspaceSnapshot } from "@/lib/api/client";
import { authClient } from "@/lib/auth-client";
import { clearWorkspaceState, hydrateWorkspace } from "@/lib/db/hydrate";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import {
  appStateStore,
  updateAppState,
  useAppState,
} from "@/lib/stores/app-state";
import { useEntityMap } from "@/lib/stores/entity-store";
import { membersStore } from "@/lib/stores/workspace-stores";

export type Member = {
  id: WorkspaceMemberId;
  name: string;
  email?: string;
  initials: string;
  isYou?: boolean;
  tone: number;
  /**
   * Null during transient states where the row came from the `/me`
   * cache (a logged-in user who hasn't hydrated their workspace
   * membership yet). Permission-gated UI should be rendered off
   * `useCan(...)`, which treats a missing role as "no permissions"
   * rather than off `m.role?.systemKey`.
   */
  role: WorkspaceRoleDTO | null;
};

export type WorkspaceView = {
  name: string;
  slug: string;
  createdAt: number;
  currentUserId: string;
  currentMemberId: WorkspaceMemberId | null;
  members: Member[];
};

export function initialsFor(name: string, email?: string | null): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = email?.trim().split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return `${local[0]}${local[0]}`.toUpperCase();
  return "?";
}

export function memberDisplayName(m: Pick<Member, "name" | "email">): string {
  const n = m.name.trim();
  if (n) return n;
  if (m.email) return titleFromEmail(m.email);
  return "Member";
}

export function titleFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local
    .split(/[.\-_+]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ") || email;
}

export function memberToView(
  member: WorkspaceMemberDTO,
  currentUserId: string | null,
): Member {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    initials: initialsFor(member.name, member.email),
    isYou: member.userId === currentUserId,
    tone: member.tone,
    role: member.role,
  };
}

function project(meAccountUserId: string | null | undefined): WorkspaceView | null {
  const appState = appStateStore.state;
  if (!appState.currentWorkspace) return null;
  const ws = appState.currentWorkspace;
  const currentUserId = meAccountUserId ?? appState.currentUser?.id ?? null;

  const members: Member[] = Array.from(membersStore.values()).map((m) =>
    memberToView(m, currentUserId),
  );

  return {
    name: ws.name,
    slug: ws.slug,
    createdAt: new Date(ws.createdAt).getTime(),
    currentUserId: currentUserId ?? "",
    currentMemberId: appState.currentMemberId,
    members,
  };
}

export function useWorkspace(): WorkspaceView | null {
  const appState = useAppState();
  const memberMap = useEntityMap(membersStore);
  const meUserId = useMeUserIdFromQueryCache();

  return useMemo(
    () => project(meUserId),
    [appState, memberMap, meUserId],
  );
}

export function meUserIdFromQueryCache(): string | null {
  const me = queryClient.getQueryData<MeResponse>(queryKeys.me());
  return me?.user.id ?? null;
}

export function useMeUserIdFromQueryCache(): string | null {
  return meUserIdFromQueryCache();
}

export function getWorkspace(): WorkspaceView | null {
  return project(meUserIdFromQueryCache());
}

export function hasWorkspace(): boolean {
  return appStateStore.state.currentWorkspace !== null;
}

export type CreateWorkspaceInput = {
  workspaceName: string;
  slug: string;
  invites?: string[];
};

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<WorkspaceSnapshot | null> {
  const res = await api.workspaces.create({
    name: input.workspaceName,
    slug: input.slug,
    invites: input.invites,
  });
  updateAppState((draft) => {
    draft.currentWorkspace = res.workspace;
    draft.currentMemberId = res.you?.id ?? null;
  });
  if (res.you) membersStore.insert(res.you);
  return hydrateWorkspace(res.workspace.slug);
}

export function resolveCurrent(): {
  slug: string;
  memberId: WorkspaceMemberId;
} | null {
  const app = appStateStore.state;
  if (!app.currentWorkspace || !app.currentMemberId) return null;
  return {
    slug: app.currentWorkspace.slug,
    memberId: app.currentMemberId,
  };
}

export async function inviteMember(
  email: string,
  opts?: { roleId?: WorkspaceRoleId },
): Promise<boolean> {
  const ctx = resolveCurrent();
  if (!ctx) return false;
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  try {
    await api.workspaces.invite(ctx.slug, trimmed, { roleId: opts?.roleId });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.workspaceInvites(ctx.slug),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiError) console.error("[workspace] invite failed", err);
    return false;
  }
}

export async function removeWorkspaceMember(targetMemberId: string): Promise<void> {
  const ctx = resolveCurrent();
  if (!ctx) throw new Error("No active workspace");
  await api.workspaces.removeMember(ctx.slug, targetMemberId);
  membersStore.delete(targetMemberId);
  void queryClient.invalidateQueries({
    queryKey: queryKeys.workspaceSnapshot(ctx.slug),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.workspaceMembers(ctx.slug),
  });
}

/** Clears TanStack Query `/v1/me` + workspace caches, entity stores, and preferred slug. */
export function clearClientSessionCaches(): void {
  clearWorkspaceState();
  setPreferredWorkspaceSlug(null);
  queryClient.removeQueries({ queryKey: queryKeys.me() });
  updateAppState((draft) => {
    draft.currentUser = null;
  });
}

export async function resetWorkspace(): Promise<void> {
  try {
    await authClient.signOut();
  } catch {
    // ignore
  }
  clearClientSessionCaches();
}

const PREFERRED_SLUG_KEY = "orbit:preferred-workspace-slug";

export function getPreferredWorkspaceSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREFERRED_SLUG_KEY);
  } catch {
    return null;
  }
}

export function setPreferredWorkspaceSlug(slug: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (slug) window.localStorage.setItem(PREFERRED_SLUG_KEY, slug);
    else window.localStorage.removeItem(PREFERRED_SLUG_KEY);
  } catch {
    // ignore
  }
}

export function teardownWorkspaceStore(): void {
  queryClient.clear();
}
