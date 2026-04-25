/**
 * Shared permission vocabulary used by the API's `requirePermission`
 * guards and the web client's `useCan` hook. Both sides read from this
 * single list so a new permission lights up in both places at once.
 *
 * Permissions are grouped into two PBAC scopes:
 *
 *  - **Workspace-scoped** (`workspace.*`, `teams.*`, `billing.*`,
 *    `workspace.members.*`): checked against the member's
 *    `WorkspaceRole` (OWNER/ADMIN/MEMBER by default; custom roles
 *    allowed). Granted to everyone in the workspace regardless of
 *    which team they're on.
 *  - **Team-scoped** (`team.*`): checked against the member's
 *    `TeamRole` for a specific team (TEAM_ADMIN/TEAM_MEMBER by
 *    default). Only meaningful in the context of "this member, for
 *    this team".
 *
 * The two scopes share a single permission union because a permission
 * string is either a workspace permission OR a team permission, never
 * both. The `scopeOf` helper resolves which scope each permission
 * belongs to.
 *
 * Feature fences (`// +feature:<name>` / `// -feature:<name>`) mark
 * the regions the generator CLI strips when a feature is not selected.
 * The trailing `;` on each union lives on its own line so stripping
 * the last branch never removes the terminator.
 */
export type WorkspacePermission =
  | "workspace.delete"
  | "workspace.settings.edit"
  | "workspace.roles.manage"
  | "workspace.members.invite"
  | "workspace.members.remove"
  | "workspace.members.change_role"
;


export type Permission = WorkspacePermission
;

export type PermissionScope = "workspace" | "team";

export const ALL_WORKSPACE_PERMISSIONS: readonly WorkspacePermission[] = [
  "workspace.delete",
  "workspace.settings.edit",
  "workspace.roles.manage",
  "workspace.members.invite",
  "workspace.members.remove",
  "workspace.members.change_role",
];


export const ALL_PERMISSIONS: readonly Permission[] = [
  ...ALL_WORKSPACE_PERMISSIONS,
];

export function scopeOf(_permission: Permission): PermissionScope {
  return "workspace";
}

export interface PermissionDescriptor {
  permission: Permission;
  label: string;
  description: string;
}

export interface PermissionGroup {
  group: string;
  scope: PermissionScope;
  items: PermissionDescriptor[];
}

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    group: "Workspace",
    scope: "workspace",
    items: [
      {
        permission: "workspace.delete",
        label: "Delete workspace",
        description:
          "Permanently delete this workspace and everything inside it.",
      },
      {
        permission: "workspace.settings.edit",
        label: "Edit workspace settings",
        description: "Change the workspace name, slug, and branding.",
      },
      {
        permission: "workspace.roles.manage",
        label: "Manage workspace roles",
        description: "Create, edit, and delete workspace-level custom roles.",
      },
    ],
  },
  {
    group: "Members",
    scope: "workspace",
    items: [
      {
        permission: "workspace.members.invite",
        label: "Invite members",
        description: "Send and revoke workspace invitations.",
      },
      {
        permission: "workspace.members.remove",
        label: "Remove members",
        description: "Remove people from the workspace.",
      },
      {
        permission: "workspace.members.change_role",
        label: "Change member roles",
        description:
          "Assign workspace-level roles to other members. Only owners can create or demote owners.",
      },
    ],
  },
];

/**
 * Stable identifiers for the three system workspace roles seeded at
 * workspace creation. `WorkspaceRole.systemKey` stores one of these
 * strings (plus null for custom roles). OWNER is permission-locked to
 * the full workspace-permission set and cannot be renamed or deleted;
 * ADMIN and MEMBER are full rows whose permission set is editable.
 */
export type WorkspaceRoleSystemKey = "OWNER" | "ADMIN" | "MEMBER";

export const WORKSPACE_ROLE_SYSTEM_KEYS: readonly WorkspaceRoleSystemKey[] = [
  "OWNER",
  "ADMIN",
  "MEMBER",
];

export const DEFAULT_OWNER_PERMISSIONS: readonly WorkspacePermission[] =
  ALL_WORKSPACE_PERMISSIONS;

export const DEFAULT_ADMIN_PERMISSIONS: readonly WorkspacePermission[] = [
  "workspace.settings.edit",
  "workspace.members.invite",
  "workspace.members.remove",
  "workspace.members.change_role",
];

export const DEFAULT_MEMBER_PERMISSIONS: readonly WorkspacePermission[] = [
];

export function defaultPermissionsFor(
  key: WorkspaceRoleSystemKey,
): readonly WorkspacePermission[] {
  switch (key) {
    case "OWNER":
      return DEFAULT_OWNER_PERMISSIONS;
    case "ADMIN":
      return DEFAULT_ADMIN_PERMISSIONS;
    case "MEMBER":
      return DEFAULT_MEMBER_PERMISSIONS;
  }
}


export function isWorkspacePermission(
  value: string,
): value is WorkspacePermission {
  return (ALL_WORKSPACE_PERMISSIONS as readonly string[]).includes(value);
}


export function isPermission(value: string): value is Permission {
  return (
    isWorkspacePermission(value)
  );
}

export function can(
  permissions: readonly Permission[],
  permission: Permission,
): boolean {
  return permissions.includes(permission);
}
