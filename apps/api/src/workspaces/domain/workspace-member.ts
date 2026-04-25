import { hashTone } from "@/identity/domain/user.ts";
import type { UserId } from "@/identity/domain/user.ts";
import type { Clock } from "@/kernel/clock.ts";
import { DomainEvent } from "@/kernel/events.ts";
import { type Id, newId } from "@/kernel/id.ts";
import type {
  WorkspacePermission,
  WorkspaceRoleSystemKey,
} from "@orbit/shared/permissions";
import type { WorkspaceRoleId } from "./workspace-role.ts";
import type { WorkspaceId } from "./workspace.ts";

export type WorkspaceMemberId = Id<"workspaceMember">;

/**
 * Snapshot of the role this member holds at the moment of hydration.
 * Stored inline on the aggregate so authorization (`hasPermission`) is
 * an O(1) set check — no repository round-trip per guard call.
 */
export interface WorkspaceMemberRoleSnapshot {
  id: WorkspaceRoleId;
  systemKey: WorkspaceRoleSystemKey | null;
  permissions: readonly WorkspacePermission[];
}

export class WorkspaceMemberJoined extends DomainEvent {
  readonly type = "workspaces.member.joined";
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly memberId: WorkspaceMemberId,
    readonly userId: UserId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class WorkspaceMemberLeft extends DomainEvent {
  readonly type = "workspaces.member.left";
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly memberId: WorkspaceMemberId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class WorkspaceMemberRoleChanged extends DomainEvent {
  readonly type = "workspaces.member.role_changed";
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly memberId: WorkspaceMemberId,
    readonly previousRoleId: WorkspaceRoleId,
    readonly newRoleId: WorkspaceRoleId,
    readonly changedByMemberId: WorkspaceMemberId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class WorkspaceMember {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: WorkspaceMemberId,
    public readonly workspaceId: WorkspaceId,
    public readonly userId: UserId,
    private _role: WorkspaceMemberRoleSnapshot,
    public readonly tone: number,
    public readonly createdAt: Date,
  ) {}

  static join(
    input: {
      workspaceId: WorkspaceId;
      userId: UserId;
      role: WorkspaceMemberRoleSnapshot;
      seed: string;
    },
    clock: Clock,
  ): WorkspaceMember {
    const id = newId("workspaceMember");
    const now = clock.now();
    const member = new WorkspaceMember(
      id,
      input.workspaceId,
      input.userId,
      input.role,
      hashTone(input.seed),
      now,
    );
    member.events.push(
      new WorkspaceMemberJoined(input.workspaceId, id, input.userId, now),
    );
    return member;
  }

  static rehydrate(props: {
    id: WorkspaceMemberId;
    workspaceId: WorkspaceId;
    userId: UserId;
    role: WorkspaceMemberRoleSnapshot;
    tone: number;
    createdAt: Date;
  }): WorkspaceMember {
    return new WorkspaceMember(
      props.id,
      props.workspaceId,
      props.userId,
      props.role,
      props.tone,
      props.createdAt,
    );
  }

  get roleId(): WorkspaceRoleId {
    return this._role.id;
  }
  get roleSnapshot(): WorkspaceMemberRoleSnapshot {
    return this._role;
  }
  get permissions(): readonly WorkspacePermission[] {
    return this._role.permissions;
  }
  get isOwner(): boolean {
    return this._role.systemKey === "OWNER";
  }

  hasPermission(permission: WorkspacePermission): boolean {
    return this._role.permissions.includes(permission);
  }

  changeRole(
    nextRole: WorkspaceMemberRoleSnapshot,
    changedByMemberId: WorkspaceMemberId,
    clock: Clock,
  ): void {
    if (nextRole.id === this._role.id) return;
    const previousRoleId = this._role.id;
    this._role = nextRole;
    this.events.push(
      new WorkspaceMemberRoleChanged(
        this.workspaceId,
        this.id,
        previousRoleId,
        nextRole.id,
        changedByMemberId,
        clock.now(),
      ),
    );
  }

  pullEvents(): DomainEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
