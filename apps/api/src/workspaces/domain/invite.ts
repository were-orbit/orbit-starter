import { randomBytes } from "node:crypto";
import { Email } from "@/identity/domain/email.ts";
import type { Clock } from "@/kernel/clock.ts";
import { ConflictError } from "@/kernel/errors.ts";
import { DomainEvent } from "@/kernel/events.ts";
import { type Id, newId } from "@/kernel/id.ts";
import type { WorkspaceMemberId } from "./workspace-member.ts";
import type { WorkspaceRoleId } from "./workspace-role.ts";
import type { WorkspaceId } from "./workspace.ts";

export type WorkspaceInviteId = Id<"workspaceInvite">;

export class InviteSent extends DomainEvent {
  readonly type = "workspaces.invite.sent";
  actorMemberId: WorkspaceMemberId | null = null;
  constructor(
    readonly inviteId: WorkspaceInviteId,
    readonly workspaceId: WorkspaceId,
    readonly email: string,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class InviteAccepted extends DomainEvent {
  readonly type = "workspaces.invite.accepted";
  constructor(
    readonly inviteId: WorkspaceInviteId,
    readonly workspaceId: WorkspaceId,
    readonly newMemberId: WorkspaceMemberId,
    readonly invitedById: WorkspaceMemberId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class InviteRevoked extends DomainEvent {
  readonly type = "workspaces.invite.revoked";
  actorMemberId: WorkspaceMemberId | null = null;
  constructor(
    readonly inviteId: WorkspaceInviteId,
    readonly workspaceId: WorkspaceId,
    readonly email: string,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class WorkspaceInvite {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: WorkspaceInviteId,
    public readonly workspaceId: WorkspaceId,
    public readonly email: string,
    public readonly token: string,
    public readonly invitedById: WorkspaceMemberId,
    public readonly roleId: WorkspaceRoleId | null,
    public readonly createdAt: Date,
    private _acceptedAt: Date | null,
    private _revokedAt: Date | null,
  ) {}

  static send(
    input: {
      workspaceId: WorkspaceId;
      email: Email;
      invitedById: WorkspaceMemberId;
      roleId: WorkspaceRoleId | null;
    },
    clock: Clock,
  ): WorkspaceInvite {
    const id = newId("workspaceInvite");
    const now = clock.now();
    const token = randomBytes(24).toString("base64url");
    const invite = new WorkspaceInvite(
      id,
      input.workspaceId,
      input.email.value,
      token,
      input.invitedById,
      input.roleId,
      now,
      null,
      null,
    );
    invite.events.push(new InviteSent(id, input.workspaceId, input.email.value, now));
    return invite;
  }

  static rehydrate(props: {
    id: WorkspaceInviteId;
    workspaceId: WorkspaceId;
    email: string;
    token: string;
    invitedById: WorkspaceMemberId;
    roleId: WorkspaceRoleId | null;
    createdAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
  }): WorkspaceInvite {
    return new WorkspaceInvite(
      props.id,
      props.workspaceId,
      props.email,
      props.token,
      props.invitedById,
      props.roleId,
      props.createdAt,
      props.acceptedAt,
      props.revokedAt,
    );
  }

  get acceptedAt(): Date | null {
    return this._acceptedAt;
  }
  get revokedAt(): Date | null {
    return this._revokedAt;
  }
  get isPending(): boolean {
    return !this._acceptedAt && !this._revokedAt;
  }

  accept(newMemberId: WorkspaceMemberId, clock: Clock): void {
    if (this._revokedAt) {
      throw new ConflictError("invite.revoked", "invite has been revoked");
    }
    if (this._acceptedAt) {
      throw new ConflictError("invite.accepted", "invite already accepted");
    }
    const now = clock.now();
    this._acceptedAt = now;
    this.events.push(new InviteAccepted(this.id, this.workspaceId, newMemberId, this.invitedById, now));
  }

  revoke(clock: Clock): void {
    if (this._acceptedAt) {
      throw new ConflictError("invite.accepted", "cannot revoke an accepted invite");
    }
    if (this._revokedAt) return;
    this._revokedAt = clock.now();
    this.events.push(
      new InviteRevoked(this.id, this.workspaceId, this.email, this._revokedAt),
    );
  }

  pullEvents(): DomainEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
