---
name: add-projector
description: Use when adding a new post-commit projector that listens to domain events from the EventBus. Covers the subscribe-once pattern, the fresh-UoW write contract, error swallowing convention, and composition.ts wiring.
---

# Adding an event-bus projector

A projector is a post-commit subscriber on the `EventBus` — a service whose job is to react to domain events AFTER the originating transaction has committed. Used for: audit log materialization, realtime broadcasts, mailer sends, webhook fan-out.

## The contract

- Triggering events come through `bus.subscribeAll(handler)` (or `bus.subscribe(<eventType>, handler)` for narrower projectors).
- Writes happen in a **fresh `uow.run()`** — never extend the originating transaction. The originating UoW has already committed by the time the bus dispatches.
- Failures **log and swallow**. A projector bug must not take the request path down.
- Don't assume ordering between projectors — they run independently.
- Don't re-read the aggregate the event came from. Carry the data you need in the event itself.

## Pattern

Reference: `apps/api/src/audit/application/audit-projector.ts`.

```ts
export class FooProjector {
  constructor(
    private readonly bus: EventBus,
    private readonly uow: UnitOfWork,
    // ...other deps (mailer, realtime hub, etc.)
  ) {}

  start(): () => void {
    return this.bus.subscribeAll(async (event) => {
      let work;
      try {
        work = mapEventToFoo(event); // pure function
      } catch (err) {
        console.error(`[foo] mapper threw for '${event.type}':`, err);
        return;
      }
      if (!work) return;

      try {
        await this.uow.run(async (tx) => {
          await tx.foo.append(work);
        });
      } catch (err) {
        console.error(`[foo] persist failed for '${event.type}':`, err);
      }
    });
  }
}
```

`start()` returns the unsubscribe function so tests can tear down cleanly.

## Steps

1. **Create the projector** at `apps/api/src/<context>/application/<name>-projector.ts`.
2. **Decide subscription scope** — `subscribeAll` is fine if a mapper returns `null` for irrelevant events; use `subscribe(eventType, …)` for narrowly-scoped projectors.
3. **Write a pure mapper** — `mapEventToWork(event: DomainEvent): Work | null`. Pure means easy unit tests.
4. **Wrap effects in `try/catch` + console.error**. Do NOT throw out of the handler.
5. **Wire in `composition.ts`**: instantiate the projector and call `.start()`. Store the unsubscribe handle if you need it for graceful shutdown.
6. **Test it**: integration test that publishes an event through a real UoW and asserts the projector wrote what you expect. The audit projector test (`apps/api/src/__tests__/audit.integration.test.ts`) is the reference.

## Don't

- Don't extend the originating transaction. Always a fresh `uow.run()`.
- Don't throw out of the handler. Log and return.
- Don't read the same aggregate the event came from — race window even after commit. Carry needed data in the event.
- Don't assume ordering between projectors.
