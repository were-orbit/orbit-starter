import { DomainEvent } from "@/kernel/events.ts";
import type { UserId } from "./user.ts";

/**
 * App-level moderation events. Fired when an app admin (or, for the dev
 * `promoteToAppAdmin` self-promote path, the user themselves) changes a
 * user's privileged status. The audit projector maps these to the
 * `AppAuditEntry` ledger so platform-admins have a global trail of who
 * was banned, promoted, or impersonated and by whom.
 *
 * These live in the identity domain because they describe transitions
 * on the User aggregate, but their consumer is the audit context.
 *
 * Events authored by better-auth's admin-plugin paths (banUser,
 * setRole, impersonate) need a separate integration that hooks into
 * better-auth's lifecycle and publishes these events — see
 * `interfaces/http/better-auth.ts`. Until that integration lands, only
 * the dev `promoteToAppAdmin` path emits them.
 */

export class AppUserRoleChanged extends DomainEvent {
  readonly type = "identity.app_user.role_changed";
  constructor(
    readonly targetUserId: UserId,
    readonly previousRole: string | null,
    readonly newRole: string | null,
    readonly actorUserId: UserId | null,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class AppUserBanned extends DomainEvent {
  readonly type = "identity.app_user.banned";
  constructor(
    readonly targetUserId: UserId,
    readonly reason: string | null,
    readonly expiresAt: Date | null,
    readonly actorUserId: UserId | null,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class AppUserUnbanned extends DomainEvent {
  readonly type = "identity.app_user.unbanned";
  constructor(
    readonly targetUserId: UserId,
    readonly actorUserId: UserId | null,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}
