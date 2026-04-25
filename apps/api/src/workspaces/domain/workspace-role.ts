import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, ValidationError } from "@/kernel/errors.ts";
import { DomainEvent } from "@/kernel/events.ts";
import { type Id, newId } from "@/kernel/id.ts";
import {
  ALL_WORKSPACE_PERMISSIONS,
  defaultPermissionsFor,
  isWorkspacePermission,
  type WorkspacePermission,
  type WorkspaceRoleSystemKey,
} from "@orbit/shared/permissions";
import type { WorkspaceId } from "./workspace.ts";

export type WorkspaceRoleId = Id<"workspaceRole">;

const SYSTEM_ROLE_NAME: Record<WorkspaceRoleSystemKey, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const SYSTEM_ROLE_DESCRIPTION: Record<WorkspaceRoleSystemKey, string> = {
  OWNER: "Full control. This role cannot be edited or removed.",
  ADMIN: "Can manage members, invites, teams, and billing.",
  MEMBER: "Default access. Can be granted more via custom roles.",
};

const SYSTEM_ROLE_SORT: Record<WorkspaceRoleSystemKey, number> = {
  OWNER: 0,
  ADMIN: 1,
  MEMBER: 2,
};

export class WorkspaceRoleCreated extends DomainEvent {
  readonly type = "workspaces.role.created";
  /** Stamped by the publishing service via `stampActor`. */
  actorMemberId: import("./workspace-member.ts").WorkspaceMemberId | null = null;
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly roleId: WorkspaceRoleId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class WorkspaceRoleUpdated extends DomainEvent {
  readonly type = "workspaces.role.updated";
  actorMemberId: import("./workspace-member.ts").WorkspaceMemberId | null = null;
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly roleId: WorkspaceRoleId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class WorkspaceRoleDeleted extends DomainEvent {
  readonly type = "workspaces.role.deleted";
  actorMemberId: import("./workspace-member.ts").WorkspaceMemberId | null = null;
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly roleId: WorkspaceRoleId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

const MAX_NAME_LEN = 48;
const MAX_DESCRIPTION_LEN = 240;

function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ValidationError("role.name_required", "role name is required");
  }
  if (trimmed.length > MAX_NAME_LEN) {
    throw new ValidationError("role.name_too_long", "role name is too long");
  }
  return trimmed;
}

function normalizeDescription(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_DESCRIPTION_LEN) {
    throw new ValidationError(
      "role.description_too_long",
      "role description is too long",
    );
  }
  return trimmed;
}

function normalizePermissions(raw: readonly string[]): WorkspacePermission[] {
  const seen = new Set<WorkspacePermission>();
  for (const p of raw) {
    if (!isWorkspacePermission(p)) {
      throw new ValidationError(
        "role.unknown_permission",
        `unknown workspace permission: ${p}`,
      );
    }
    seen.add(p);
  }
  return ALL_WORKSPACE_PERMISSIONS.filter((p) => seen.has(p));
}

export class WorkspaceRole {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: WorkspaceRoleId,
    public readonly workspaceId: WorkspaceId,
    private _name: string,
    private _description: string | null,
    public readonly isSystem: boolean,
    public readonly systemKey: WorkspaceRoleSystemKey | null,
    private _sortOrder: number,
    private _permissions: WorkspacePermission[],
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(
    input: {
      workspaceId: WorkspaceId;
      name: string;
      description?: string | null;
      permissions: readonly string[];
      sortOrder?: number;
    },
    clock: Clock,
  ): WorkspaceRole {
    const id = newId("workspaceRole");
    const now = clock.now();
    const role = new WorkspaceRole(
      id,
      input.workspaceId,
      normalizeName(input.name),
      normalizeDescription(input.description),
      false,
      null,
      input.sortOrder ?? 100,
      normalizePermissions(input.permissions),
      now,
      now,
    );
    role.events.push(new WorkspaceRoleCreated(input.workspaceId, id, now));
    return role;
  }

  /**
   * Seed the three system roles (OWNER/ADMIN/MEMBER) at workspace
   * creation. System roles carry stable `systemKey` values and are not
   * deletable; OWNER is additionally name- and permission-locked.
   */
  static seedSystem(
    input: { workspaceId: WorkspaceId; key: WorkspaceRoleSystemKey },
    clock: Clock,
  ): WorkspaceRole {
    const id = newId("workspaceRole");
    const now = clock.now();
    const role = new WorkspaceRole(
      id,
      input.workspaceId,
      SYSTEM_ROLE_NAME[input.key],
      SYSTEM_ROLE_DESCRIPTION[input.key],
      true,
      input.key,
      SYSTEM_ROLE_SORT[input.key],
      [...defaultPermissionsFor(input.key)],
      now,
      now,
    );
    role.events.push(new WorkspaceRoleCreated(input.workspaceId, id, now));
    return role;
  }

  static rehydrate(props: {
    id: WorkspaceRoleId;
    workspaceId: WorkspaceId;
    name: string;
    description: string | null;
    isSystem: boolean;
    systemKey: WorkspaceRoleSystemKey | null;
    sortOrder: number;
    permissions: readonly string[];
    createdAt: Date;
    updatedAt: Date;
  }): WorkspaceRole {
    return new WorkspaceRole(
      props.id,
      props.workspaceId,
      props.name,
      props.description,
      props.isSystem,
      props.systemKey,
      props.sortOrder,
      // Tolerant of legacy / unknown permission strings on rehydrate —
      // we filter to the known set instead of throwing so a rolled-back
      // code change doesn't wedge the workspace on boot.
      (props.permissions as readonly string[]).filter(isWorkspacePermission),
      props.createdAt,
      props.updatedAt,
    );
  }

  get name(): string {
    return this._name;
  }
  get description(): string | null {
    return this._description;
  }
  get sortOrder(): number {
    return this._sortOrder;
  }
  get permissions(): readonly WorkspacePermission[] {
    return this._permissions;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  has(permission: WorkspacePermission): boolean {
    return this._permissions.includes(permission);
  }

  isOwnerRole(): boolean {
    return this.systemKey === "OWNER";
  }

  rename(next: string, clock: Clock): void {
    if (this.isSystem) {
      throw new ConflictError(
        "role.system_name_locked",
        "built-in roles cannot be renamed",
      );
    }
    const normalized = normalizeName(next);
    if (normalized === this._name) return;
    this._name = normalized;
    this.touch(clock);
  }

  setDescription(next: string | null | undefined, clock: Clock): void {
    const normalized = normalizeDescription(next);
    if (normalized === this._description) return;
    this._description = normalized;
    this.touch(clock);
  }

  setPermissions(next: readonly string[], clock: Clock): void {
    if (this.isOwnerRole()) {
      throw new ConflictError(
        "role.owner_locked",
        "the Owner role's permissions cannot be edited",
      );
    }
    const normalized = normalizePermissions(next);
    if (
      normalized.length === this._permissions.length &&
      normalized.every((p, i) => p === this._permissions[i])
    ) {
      return;
    }
    this._permissions = normalized;
    this.touch(clock);
  }

  setSortOrder(next: number, clock: Clock): void {
    if (!Number.isFinite(next)) {
      throw new ValidationError("role.sort_invalid", "invalid sort order");
    }
    if (next === this._sortOrder) return;
    this._sortOrder = next;
    this.touch(clock);
  }

  /**
   * Mark for deletion. Rejects for system roles; the service is still
   * responsible for checking that no member currently holds the role
   * before committing.
   */
  markDeleted(clock: Clock): void {
    if (this.isSystem) {
      throw new ConflictError(
        "role.system_undeletable",
        "built-in roles cannot be deleted",
      );
    }
    this.events.push(
      new WorkspaceRoleDeleted(this.workspaceId, this.id, clock.now()),
    );
  }

  private touch(clock: Clock): void {
    this._updatedAt = clock.now();
    // Coalesce repeated edits within the same UoW into a single event;
    // subscribers re-read the aggregate anyway.
    if (!this.events.some((e) => e instanceof WorkspaceRoleUpdated)) {
      this.events.push(
        new WorkspaceRoleUpdated(this.workspaceId, this.id, this._updatedAt),
      );
    }
  }

  pullEvents(): DomainEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
