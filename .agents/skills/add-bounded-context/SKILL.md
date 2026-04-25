---
name: add-bounded-context
description: Use when adding a new DDD bounded context to the Orbit API. Covers the domain/application/infrastructure folder layout, paired Prisma+Drizzle repositories, repository interfaces, the aggregate + domain event pattern, service classes, and composition.ts wiring.
---

# Adding a bounded context

Every context in `apps/api/src/<name>/` follows the same three-folder layout. The **domain** layer defines aggregates, value objects, events, and repository INTERFACES. **Application** is service classes (one per use case). **Infrastructure** is the Prisma + Drizzle implementations of those interfaces.

## Folder layout

```
apps/api/src/<context>/
  domain/
    <aggregate>.ts              # aggregate root + domain events
    repositories.ts             # repository interfaces
    <value-object>.ts           # if needed (e.g. team-slug.ts)
  application/
    <verb>-<aggregate>.service.ts   # one class per use case
  infrastructure/
    prisma-<aggregate>.repository.ts
    drizzle-<aggregate>.repository.ts
```

Reference: `apps/api/src/teams/` is the canonical example with the full pattern (aggregate, slug VO, multiple repositories, several services).

## Aggregate

The aggregate is the consistency boundary. Mutations go through methods that emit events; rehydration is the only way to reconstruct from persistence.

Pattern (from `apps/api/src/teams/domain/team.ts`):

- **Private constructor**. `static create()` for new instances (emits a `<Aggregate>Created` event), `static rehydrate()` for loading from the DB.
- **Domain events** extend `DomainEvent` from `@/kernel/events.ts`. They carry the data projectors and the audit log need.
- **`pullEvents()`** drains the event buffer; the UoW calls this on save.
- **Validation** in private `normalize*` functions that throw `ValidationError` from `@/kernel/errors.ts`.
- **IDs** are branded via `Id<"<context-key>">` from `@/kernel/id.ts`; generate with `newId("<context-key>")`.
- **Mutators take `Clock`** so timestamps and event `occurredAt` are mockable.

## Repository interfaces

Live in `domain/repositories.ts`. Methods are aggregate-shaped — `findById`, `findBy<Query>`, `save`, `delete`. Never expose ORM types in the signatures. Multiple repositories per context are fine (e.g. `TeamRepository`, `TeamMemberRepository`, `TeamRoleRepository`).

## Repository implementations

Both implementations live in `infrastructure/`:

- **Prisma**: takes a `PrismaTransactionClient` in the constructor. Map between Prisma rows and `Aggregate.rehydrate({...})`.
- **Drizzle**: takes the Drizzle transaction. Same mapping.

The two implementations MUST behave identically — both are exercised by the same domain-level integration suite. See `apps/api/src/teams/infrastructure/` for the canonical pair.

## Service class

One class per use case (`CreateTeamService`, `RenameTeamService`). Constructor takes `UnitOfWork` + any dependencies (`Clock`, other services). The `execute()` method runs in a single `uow.run()`:

```ts
await this.uow.run(async (tx) => {
  const team = Team.create({ ... }, this.clock);
  await tx.teams.save(team);
  for (const event of team.pullEvents()) tx.events.add(event);
});
```

## Wiring

1. **UoW transaction context**: add the new repositories to both `prisma-uow.ts` and `drizzle-uow.ts` so they're accessible as `tx.<name>`.
2. **`composition.ts`**: instantiate the service classes and add them to the returned dependency container.
3. **HTTP**: add a controller in `apps/api/src/interfaces/http/controllers/<name>.controller.ts` and mount it in `router.ts`.
4. **DTOs** in `packages/shared/src/dto.ts` for any payloads crossing the wire.
5. **Permissions** (if needed): use the `add-permission` skill.
6. **Audit log** (if events should be logged): use the `add-audit-event` skill.

## Sanity check

- `npm run typecheck` passes
- Write an integration test in `apps/api/src/__tests__/<name>.integration.test.ts` exercising the service through real Prisma + Drizzle UoWs
- `tx.<name>` appears in both UoW transaction-context types
