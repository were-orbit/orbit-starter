import { useMemo } from "react";
import type {
  WorkspacePermission,
} from "@orbit/shared/permissions";
import { type Member, useWorkspace } from "@/lib/workspace";

/**
 * The current viewer's workspace membership. Null during hydration and
 * outside of a workspace context.
 */
export function useCurrentMember(): Member | null {
  const ws = useWorkspace();
  return useMemo(() => ws?.members.find((m) => m.isYou) ?? null, [ws?.members]);
}

/**
 * Workspace-scoped permission check. Mirrors the API's
 * `requirePermission` semantics: a missing role resolves to `false`.
 */
export function useCan(permission: WorkspacePermission): boolean {
  const me = useCurrentMember();
  return me?.role?.permissions.includes(permission) ?? false;
}

export function memberCan(
  member: Member | null | undefined,
  permission: WorkspacePermission,
): boolean {
  return member?.role?.permissions.includes(permission) ?? false;
}

