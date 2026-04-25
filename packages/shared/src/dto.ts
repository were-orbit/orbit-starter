import type { Id } from "./ids.ts";
import type { OrbitThemeMode, OrbitThemePalette } from "./themes.ts";
import type {
  Permission,
  WorkspacePermission,
  WorkspaceRoleSystemKey,
} from "./permissions.ts";

export type UserId = Id<"user">;
export type WorkspaceId = Id<"workspace">;
export type WorkspaceMemberId = Id<"workspaceMember">;
export type WorkspaceInviteId = Id<"workspaceInvite">;
export type WorkspaceRoleId = Id<"workspaceRole">;

/** Back-compat alias for the stable key union on the three seeded
 * workspace roles. Custom roles carry `systemKey === null`. */
export type WorkspaceRole = WorkspaceRoleSystemKey;

export interface UserDTO {
  id: UserId;
  email: string;
  name: string;
  avatarTone: number;
  createdAt: string;
  themeMode: OrbitThemeMode | null;
  themePalette: OrbitThemePalette | null;
  // +feature:auth-admin
  role: "admin" | "user" | null;
  impersonatedBy: string | null;
  // -feature:auth-admin
}

export interface WorkspaceDTO {
  id: WorkspaceId;
  slug: string;
  name: string;
  ownerId: UserId;
  createdAt: string;
}

export interface WorkspaceRoleDTO {
  id: WorkspaceRoleId;
  workspaceId: WorkspaceId;
  name: string;
  description: string | null;
  /** True for the three seeded roles (OWNER/ADMIN/MEMBER). */
  isSystem: boolean;
  /** Non-null only on system roles; stable identifier the server keys on. */
  systemKey: WorkspaceRoleSystemKey | null;
  sortOrder: number;
  permissions: WorkspacePermission[];
  /** Number of members currently assigned. Sent with list/snapshot responses. */
  memberCount?: number;
  createdAt: string;
}

export interface WorkspaceMemberDTO {
  id: WorkspaceMemberId;
  workspaceId: WorkspaceId;
  userId: UserId;
  name: string;
  email: string;
  role: WorkspaceRoleDTO;
  tone: number;
  createdAt: string;
}

export interface WorkspaceInviteDTO {
  id: WorkspaceInviteId;
  workspaceId: WorkspaceId;
  email: string;
  invitedById: WorkspaceMemberId;
  /** Role assigned on accept, or null to fall back to MEMBER at accept time. */
  role: WorkspaceRoleDTO | null;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}


export interface SubmitOnboardingIntentInput {
  ownerName: string;
  workspaceName: string;
  workspaceSlug: string;
  invitedEmails: string[];
}

export interface OnboardingIntentStatus {
  submitted: boolean;
}

/**
 * Public runtime config served by `GET /v1/config`. Read unauthenticated
 * so pre-login pages (request-access, login) can branch on the same
 * flags as the authenticated app. Never include secrets or per-user
 * data here.
 */
export interface RuntimeConfigDTO {
}

/** Helper alias used by shared code that wants a permission in either scope. */
export type AnyPermission = Permission;

