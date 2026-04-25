import type {
  WorkspaceMemberDTO,
  WorkspaceMemberId,
  WorkspaceRoleDTO,
  WorkspaceRoleId,
} from "./dto.ts";

/**
 * Events the server pushes to clients over the workspace WebSocket
 * connection. Scoped to workspace-level lifecycle: membership, roles,
 * teams, billing, and presence. Feature modules living on top of the
 * kit (e.g. a chat layer) can extend this union in their own app.
 */
export type ServerEvent =
  | {
      type: "hello";
      workspaceMemberId: WorkspaceMemberId;
      serverTime: number;
    }
  | { type: "workspace.member.joined"; member: WorkspaceMemberDTO }
  | { type: "workspace.member.left"; workspaceMemberId: WorkspaceMemberId }
  | { type: "workspace.member.role_changed"; member: WorkspaceMemberDTO }
  | { type: "workspace.role.created"; role: WorkspaceRoleDTO }
  | { type: "workspace.role.updated"; role: WorkspaceRoleDTO }
  | { type: "workspace.role.deleted"; roleId: WorkspaceRoleId }
  | {
      type: "presence.update";
      workspaceMemberId: WorkspaceMemberId;
      status: "online" | "away" | "offline";
      lastSeenAt: string;
    };

export type ClientEvent =
  | { type: "ping" }
  | { type: "presence.away" }
  | { type: "presence.back" };
