import type { UserId } from "@/identity/domain/user.ts";
import type { Clock } from "@/kernel/clock.ts";
import { DomainEvent } from "@/kernel/events.ts";
import { type Id, newId } from "@/kernel/id.ts";
import type { WorkspaceMemberId } from "./workspace-member.ts";
import { WorkspaceSlug } from "./workspace-slug.ts";

export type WorkspaceId = Id<"workspace">;

export class WorkspaceCreated extends DomainEvent {
  readonly type = "workspaces.workspace.created";
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly ownerId: UserId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class WorkspaceDeleted extends DomainEvent {
  readonly type = "workspaces.workspace.deleted";
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly slug: string,
    readonly name: string,
    readonly deletedByMemberId: WorkspaceMemberId | null,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class Workspace {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: WorkspaceId,
    private _slug: WorkspaceSlug,
    private _name: string,
    public readonly ownerId: UserId,
    public readonly createdAt: Date,
  ) {}

  static open(
    input: { slug: WorkspaceSlug; name: string; ownerId: UserId },
    clock: Clock,
  ): Workspace {
    const id = newId("workspace");
    const now = clock.now();
    const ws = new Workspace(id, input.slug, input.name.trim() || input.slug.value, input.ownerId, now);
    ws.events.push(new WorkspaceCreated(id, input.ownerId, now));
    return ws;
  }

  static rehydrate(props: {
    id: WorkspaceId;
    slug: WorkspaceSlug;
    name: string;
    ownerId: UserId;
    createdAt: Date;
  }): Workspace {
    return new Workspace(props.id, props.slug, props.name, props.ownerId, props.createdAt);
  }

  get slug(): WorkspaceSlug {
    return this._slug;
  }
  get name(): string {
    return this._name;
  }

  rename(next: string): void {
    const trimmed = next.trim();
    if (trimmed) this._name = trimmed;
  }

  pullEvents(): DomainEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
