import type {
  WorkspaceInviteDTO,
  WorkspaceMemberDTO,
  WorkspaceMemberId,
  WorkspaceRoleDTO,
} from "@orbit/shared/dto";
import { EntityStore } from "./entity-store";

// +feature:realtime
export interface PresenceRow {
  workspaceMemberId: WorkspaceMemberId;
  status: "online" | "away" | "offline";
  lastSeenAt: string;
}
// -feature:realtime

export const membersStore = new EntityStore<WorkspaceMemberDTO>((m) => m.id);
export const rolesStore = new EntityStore<WorkspaceRoleDTO>((r) => r.id);
export const invitesStore = new EntityStore<WorkspaceInviteDTO>((i) => i.id);
// +feature:realtime
export const presenceStore = new EntityStore<PresenceRow>(
  (p) => p.workspaceMemberId,
);
// -feature:realtime

export type { WorkspaceMemberId };
