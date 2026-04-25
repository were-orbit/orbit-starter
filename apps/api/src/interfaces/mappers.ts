import type {
  UserDTO,
  WorkspaceDTO,
  WorkspaceInviteDTO,
  WorkspaceMemberDTO,
  WorkspaceRoleDTO,
} from "@orbit/shared/dto";
import type { User } from "@/identity/domain/user.ts";
import type { WorkspaceInvite } from "@/workspaces/domain/invite.ts";
import type { WorkspaceMember } from "@/workspaces/domain/workspace-member.ts";
import type { WorkspaceRole } from "@/workspaces/domain/workspace-role.ts";
import type { Workspace } from "@/workspaces/domain/workspace.ts";

export function userToDTO(u: User): UserDTO {
  return {
    id: u.id,
    email: u.email.value,
    name: u.name,
    avatarTone: u.avatarTone,
    createdAt: u.createdAt.toISOString(),
    themeMode: u.themeMode,
    themePalette: u.themePalette,
    // +feature:auth-admin
    // Overridden at call sites that read the raw better-auth row (see
    // `auth.controller.ts` for `/v1/me`). Not modelled on the User
    // aggregate, so the DTO-mapper defaults to null.
    role: null,
    impersonatedBy: null,
    // -feature:auth-admin
  };
}

export function workspaceToDTO(w: Workspace): WorkspaceDTO {
  return {
    id: w.id,
    slug: w.slug.value,
    name: w.name,
    ownerId: w.ownerId,
    createdAt: w.createdAt.toISOString(),
  };
}

export function workspaceRoleToDTO(
  r: WorkspaceRole,
  opts?: { memberCount?: number },
): WorkspaceRoleDTO {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    systemKey: r.systemKey,
    sortOrder: r.sortOrder,
    permissions: [...r.permissions],
    memberCount: opts?.memberCount,
    createdAt: r.createdAt.toISOString(),
  };
}

export function workspaceMemberToDTO(
  m: WorkspaceMember,
  user: { email: string; name: string },
  role: WorkspaceRole,
): WorkspaceMemberDTO {
  return {
    id: m.id,
    workspaceId: m.workspaceId,
    userId: m.userId,
    name: user.name,
    email: user.email,
    role: workspaceRoleToDTO(role),
    tone: m.tone,
    createdAt: m.createdAt.toISOString(),
  };
}

export function workspaceInviteToDTO(
  i: WorkspaceInvite,
  role: WorkspaceRole | null,
): WorkspaceInviteDTO {
  return {
    id: i.id,
    workspaceId: i.workspaceId,
    email: i.email,
    invitedById: i.invitedById,
    role: role ? workspaceRoleToDTO(role) : null,
    createdAt: i.createdAt.toISOString(),
    acceptedAt: i.acceptedAt?.toISOString() ?? null,
    revokedAt: i.revokedAt?.toISOString() ?? null,
  };
}


