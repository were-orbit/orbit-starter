import type { UserId } from "@/identity/domain/user.ts";
import type { WorkspaceRoleSystemKey } from "@orbit/shared/permissions";
import type { WorkspaceInvite, WorkspaceInviteId } from "./invite.ts";
import type {
  WorkspaceMember,
  WorkspaceMemberId,
} from "./workspace-member.ts";
import type {
  WorkspaceRole,
  WorkspaceRoleId,
} from "./workspace-role.ts";
import type { Workspace, WorkspaceId } from "./workspace.ts";

export interface WorkspaceRepository {
  findById(id: WorkspaceId): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findOwnedBy(userId: UserId): Promise<Array<{
    id: WorkspaceId;
    name: string;
    slug: string;
  }>>;
  save(workspace: Workspace): Promise<void>;
  delete(id: WorkspaceId): Promise<void>;
}

export interface WorkspaceMembershipSummary {
  id: WorkspaceMemberId;
  workspaceId: WorkspaceId;
  slug: string;
  name: string;
  /** Display name of the role the member holds (e.g. "Owner", "Moderator"). */
  roleName: string;
  /** Non-null only when the member is on a system role. */
  roleSystemKey: WorkspaceRoleSystemKey | null;
}

export interface WorkspaceMemberRepository {
  findById(id: WorkspaceMemberId): Promise<WorkspaceMember | null>;
  findByWorkspaceAndUser(
    workspaceId: WorkspaceId,
    userId: UserId,
  ): Promise<WorkspaceMember | null>;
  findByWorkspaceAndEmail(
    workspaceId: WorkspaceId,
    email: string,
  ): Promise<WorkspaceMember | null>;
  listForWorkspace(workspaceId: WorkspaceId): Promise<WorkspaceMember[]>;
  listSummariesForUser(userId: UserId): Promise<WorkspaceMembershipSummary[]>;
  countByRole(roleId: WorkspaceRoleId): Promise<number>;
  countOwners(workspaceId: WorkspaceId): Promise<number>;
  save(member: WorkspaceMember): Promise<void>;
  delete(id: WorkspaceMemberId): Promise<void>;
}

export interface WorkspaceInviteRepository {
  findById(id: WorkspaceInviteId): Promise<WorkspaceInvite | null>;
  findByToken(token: string): Promise<WorkspaceInvite | null>;
  findActiveByEmail(
    workspaceId: WorkspaceId,
    email: string,
  ): Promise<WorkspaceInvite | null>;
  listPendingForWorkspace(
    workspaceId: WorkspaceId,
    opts?: { query?: string },
  ): Promise<WorkspaceInvite[]>;
  /**
   * True if an open (un-accepted, un-revoked) invite exists for this
   * email in ANY workspace. Used by the sign-up gate so an invited
   * email can sign up during waitlist mode.
   */
  hasPendingInviteForEmail(email: string): Promise<boolean>;
  save(invite: WorkspaceInvite): Promise<void>;
}

export interface WorkspaceRoleWithMemberCount {
  role: WorkspaceRole;
  memberCount: number;
}

export interface WorkspaceRoleRepository {
  findById(id: WorkspaceRoleId): Promise<WorkspaceRole | null>;
  /**
   * Batch lookup for DTO hydration paths (member list, invite list).
   * Returns only roles that exist; callers handle the missing-id case
   * themselves. Far cheaper than looping over `findById`.
   */
  findManyByIds(ids: readonly WorkspaceRoleId[]): Promise<WorkspaceRole[]>;
  findByWorkspaceAndSystemKey(
    workspaceId: WorkspaceId,
    key: WorkspaceRoleSystemKey,
  ): Promise<WorkspaceRole | null>;
  listForWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<WorkspaceRoleWithMemberCount[]>;
  save(role: WorkspaceRole): Promise<void>;
  delete(id: WorkspaceRoleId): Promise<void>;
}
