export abstract class DomainEvent {
  readonly occurredAt: Date;
  abstract readonly type: string;

  constructor(occurredAt: Date) {
    this.occurredAt = occurredAt;
  }
}

/**
 * Stamp `actorMemberId` onto every event in `events` that exposes the
 * field and hasn't been attributed yet. Lets services attribute every
 * event a domain method just emitted to the calling member without
 * threading actor through every aggregate-method signature.
 *
 * Skips events where `actorMemberId` is already populated — useful for
 * events like `WorkspaceMemberRoleChanged` that carry their own
 * domain-meaningful actor (`changedByMemberId`) and shouldn't be
 * re-stamped.
 */
export function stampActor<E extends DomainEvent>(
  events: readonly E[],
  actorMemberId: string | null,
): readonly E[] {
  for (const e of events) {
    if (
      "actorMemberId" in e &&
      (e as { actorMemberId: unknown }).actorMemberId == null
    ) {
      (e as { actorMemberId: string | null }).actorMemberId = actorMemberId;
    }
  }
  return events;
}

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => void | Promise<void>;

export interface EventBus {
  subscribe<E extends DomainEvent>(
    type: string,
    handler: EventHandler<E>,
  ): () => void;
  subscribeAll(handler: EventHandler): () => void;
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: readonly DomainEvent[]): Promise<void>;
}

export class InProcessEventBus implements EventBus {
  private readonly byType = new Map<string, Set<EventHandler>>();
  private readonly all = new Set<EventHandler>();

  subscribe<E extends DomainEvent>(
    type: string,
    handler: EventHandler<E>,
  ): () => void {
    let set = this.byType.get(type);
    if (!set) {
      set = new Set();
      this.byType.set(type, set);
    }
    set.add(handler as EventHandler);
    return () => {
      set!.delete(handler as EventHandler);
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    this.all.add(handler);
    return () => {
      this.all.delete(handler);
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    const byType = this.byType.get(event.type);
    if (byType) {
      for (const handler of byType) await handler(event);
    }
    for (const handler of this.all) await handler(event);
  }

  async publishMany(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) await this.publish(event);
  }
}

export class RecordingEventBus implements EventBus {
  readonly events: DomainEvent[] = [];
  private readonly inner = new InProcessEventBus();

  subscribe<E extends DomainEvent>(
    type: string,
    handler: EventHandler<E>,
  ): () => void {
    return this.inner.subscribe(type, handler);
  }

  subscribeAll(handler: EventHandler): () => void {
    return this.inner.subscribeAll(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
    await this.inner.publish(event);
  }

  async publishMany(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) await this.publish(event);
  }

  clear(): void {
    this.events.length = 0;
  }
}
