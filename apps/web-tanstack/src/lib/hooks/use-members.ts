import { useMemo } from "react";
import { useAppState } from "@/lib/stores/app-state";
import { useEntityMap } from "@/lib/stores/entity-store";
import { membersStore } from "@/lib/stores/workspace-stores";
import { useMeUser } from "@/lib/use-me-user";
import { type Member, memberToView } from "@/lib/workspace";

/**
 * All workspace members as view objects. Subscribes to the members store,
 * app state, and the `/me` Query so `isYou` stays accurate when the
 * current account resolves late.
 */
export function useMembers(): Member[] {
  const memberMap = useEntityMap(membersStore);
  const appState = useAppState();
  const me = useMeUser();

  return useMemo(() => {
    const currentUserId = me?.id ?? appState.currentUser?.id ?? null;
    return Array.from(memberMap.values()).map((m) =>
      memberToView(m, currentUserId),
    );
  }, [memberMap, me, appState.currentUser]);
}

/**
 * Id-keyed map of workspace members for O(1) lookup in render loops.
 */
export function useMembersById(): Map<string, Member> {
  const members = useMembers();
  return useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);
}

/**
 * The signed-in user's member row in the current workspace, or `null` if
 * we haven't linked a membership yet (pre-hydration or across signout).
 */
export function useCurrentMember(): Member | null {
  const members = useMembers();
  const { currentMemberId } = useAppState();
  return useMemo(() => {
    if (currentMemberId) {
      return members.find((m) => m.id === currentMemberId) ?? null;
    }
    return members.find((m) => m.isYou) ?? null;
  }, [members, currentMemberId]);
}

/**
 * The current workspace-member id. Convenience for code paths that only
 * need the id (e.g. permission checks, optimistic inserts).
 */
export function useCurrentMemberId(): string | null {
  return useAppState().currentMemberId;
}
