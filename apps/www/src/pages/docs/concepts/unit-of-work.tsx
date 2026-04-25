import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsLayout,
  DocsList,
  DocsP,
} from "@/components/docs-layout";
import { OrmTabs } from "@/components/orm-tabs";

export const meta = {
  title: "Unit of Work + event dispatch",
  description:
    "Every write runs inside one transaction. Domain events are collected there and dispatched after commit — so projectors always see committed state.",
};

export function UnitOfWorkPage() {
  return (
    <DocsLayout
      kicker="02 · Concepts"
      title={meta.title}
      description={meta.description}
      path="/docs/concepts/unit-of-work"
    >
      <DocsP>
        The Unit of Work is the single seam through which every mutation
        passes. Services never touch the ORM client directly; they ask the
        UoW for a transactional context, call repository methods, and
        record domain events. The UoW opens a Postgres transaction, runs
        the work, commits, and <em>then</em> dispatches events to the event
        bus.
      </DocsP>
      <DocsP>
        Both ORM tracks extend the same{" "}
        <DocsCode>BaseUnitOfWork</DocsCode> abstract class — event
        collection, the read-only proxy, and post-commit dispatch are
        identical across <DocsCode>PrismaUnitOfWork</DocsCode> and{" "}
        <DocsCode>DrizzleUnitOfWork</DocsCode>. Everything below applies to
        both.
      </DocsP>

      <DocsH2>Two modes: <DocsCode>run</DocsCode> and <DocsCode>read</DocsCode></DocsH2>
      <DocsCodeBlock caption="apps/api/src/kernel/uow.ts">
        {`export interface UnitOfWork {
  run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>;
  read<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>;
}`}
      </DocsCodeBlock>
      <DocsP>
        <DocsCode>run()</DocsCode> opens a transaction, commits on success,
        rolls back on throw. <DocsCode>read()</DocsCode> runs the same repository
        API against a read-only context with no transaction and no event
        collector — a proxy wraps every repository and throws if you call a
        write method. Use <DocsCode>read()</DocsCode> for queries, keep every
        mutation inside <DocsCode>run()</DocsCode>.
      </DocsP>

      <DocsCallout>
        There's no middle tier. Services either write through{" "}
        <DocsCode>uow.run()</DocsCode>, or they read through{" "}
        <DocsCode>uow.read()</DocsCode> — nothing else. That constraint keeps
        transaction boundaries explicit and makes it impossible to silently
        emit a domain event from a query path.
      </DocsCallout>

      <DocsH2>The TxContext</DocsH2>
      <DocsP>
        <DocsCode>TxContext</DocsCode> is the bag of repositories and the
        event collector that gets handed to your function. Every repository
        on it is transactional — they all share the same transactional
        handle, so writes across multiple aggregates commit together:
      </DocsP>
      <DocsCodeBlock>
        {`export interface TxContext {
  users: UserRepository;
  workspaces: WorkspaceRepository;
  workspaceMembers: WorkspaceMemberRepository;
  workspaceInvites: WorkspaceInviteRepository;
  workspaceRoles: WorkspaceRoleRepository;
  teams: TeamRepository;
  teamMembers: TeamMemberRepository;
  teamRoles: TeamRoleRepository;
  billingCustomers: BillingCustomerRepository;
  subscriptions: SubscriptionRepository;
  billingEvents: BillingEventRepository;
  events: TxEventCollector;
}`}
      </DocsCodeBlock>

      <DocsH2>A real service</DocsH2>
      <DocsP>
        Here's the shape of a service. Read aggregates, mutate via domain
        methods, save, collect the resulting events, let the UoW do the rest:
      </DocsP>
      <DocsCodeBlock caption="Inside a service">
        {`await uow.run(async (tx) => {
  const workspace = await tx.workspaces.findBySlug(slug);
  if (!workspace) throw new NotFoundError("workspace.not_found");

  const role = await tx.workspaceRoles.findByWorkspaceAndSystemKey(
    workspace.id,
    "MEMBER",
  );

  const member = WorkspaceMember.join(
    { workspaceId: workspace.id, userId, role: snapshotOf(role), seed: userId },
    clock,
  );
  await tx.workspaceMembers.save(member);

  tx.events.addMany(member.pullEvents()); // WorkspaceMemberJoined
});`}
      </DocsCodeBlock>

      <DocsH2>What the UoW does after commit</DocsH2>
      <DocsP>
        Once the transaction callback returns and Postgres commits, the UoW
        dispatches every event you added to the event bus. The logic lives
        on the shared <DocsCode>BaseUnitOfWork</DocsCode>; each ORM subclass
        only supplies how to open a transaction:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/kernel/base-uow.ts">
        {`async run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
  const pending: DomainEvent[] = [];
  const collector: TxEventCollector = {
    add: (event) => pending.push(event),
    addMany: (events) => { for (const e of events) pending.push(e); },
  };

  const result = await this.openTransaction(async (handle) => {
    const ctx: TxContext = { ...this.buildContext(handle), events: collector };
    return fn(ctx);
  });

  if (pending.length > 0) {
    await this.bus.publishMany(pending);
  }
  return result;
}`}
      </DocsCodeBlock>
      <OrmTabs
        prisma={
          <DocsCodeBlock caption="apps/api/src/infrastructure/prisma-uow.ts — open a Prisma transaction">
            {`protected openTransaction<T>(fn: (handle: Prisma) => Promise<T>): Promise<T> {
  return this.db.$transaction((tx) => fn(tx as unknown as Prisma));
}`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock caption="apps/api/src/infrastructure/drizzle-uow.ts — open a Drizzle transaction">
            {`protected openTransaction<T>(fn: (handle: Drizzle) => Promise<T>): Promise<T> {
  return this.db.transaction((tx) => fn(tx as unknown as Drizzle));
}`}
          </DocsCodeBlock>
        }
      />
      <DocsP>This is load-bearing for two reasons:</DocsP>
      <DocsList>
        <li>
          <strong>Projectors never extend the transaction budget.</strong> If
          the realtime publisher takes 50 ms to do a query, it doesn't push the
          parent transaction's row-lock window out by 50 ms.
        </li>
        <li>
          <strong>Projectors always see committed state.</strong> If a
          projector opens a new read to build a DTO, it's guaranteed to find
          the rows that triggered the event — no read-after-write races against
          an uncommitted transaction.
        </li>
      </DocsList>

      <DocsH2>The event bus</DocsH2>
      <DocsP>
        <DocsCode>EventBus</DocsCode> is a thin pub/sub:
      </DocsP>
      <DocsCodeBlock>
        {`export interface EventBus {
  subscribe<E extends DomainEvent>(type: string, handler: EventHandler<E>): () => void;
  subscribeAll(handler: EventHandler): () => void;
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: readonly DomainEvent[]): Promise<void>;
}`}
      </DocsCodeBlock>
      <DocsP>
        The default implementation (<DocsCode>InProcessEventBus</DocsCode>)
        runs handlers sequentially in the same process. Tests use{" "}
        <DocsCode>RecordingEventBus</DocsCode>, which keeps an array of
        everything published so you can assert on it directly.
      </DocsP>
      <DocsCallout>
        Handlers run sequentially and errors propagate. One slow projector
        blocks others; one throwing projector kills the whole publish. When
        you need the opposite, wrap the handler body in{" "}
        <DocsCode>try/catch</DocsCode> and log — domain events are not a
        reliable job queue. For long work, enqueue a job from the projector
        instead.
      </DocsCallout>

      <DocsH2>Projectors</DocsH2>
      <DocsP>
        A projector is any class that subscribes to events and does something
        with them. The two that ship with the kit:
      </DocsP>
      <DocsList>
        <li>
          <strong>RealtimeEventPublisher</strong> — translates domain events
          into <DocsCode>ServerEvent</DocsCode> DTOs and broadcasts them on
          the appropriate workspace/team/member channel.
        </li>
        <li>
          <strong>Mailer projectors</strong> — listen for{" "}
          <DocsCode>WorkspaceInvited</DocsCode> and friends; ask the{" "}
          <DocsCode>Mailer</DocsCode> port to send the corresponding email.
        </li>
      </DocsList>
      <DocsP>Shape of a projector:</DocsP>
      <DocsCodeBlock>
        {`this.bus.subscribe<WorkspaceMemberJoined>(
  "workspaces.member.joined",
  async (event) => {
    const dto = await this.uow.read(async (tx) => {
      const member = await tx.workspaceMembers.findById(event.memberId);
      if (!member) return null;
      const [user, role] = await Promise.all([
        tx.users.findById(member.userId),
        tx.workspaceRoles.findById(member.roleId),
      ]);
      return workspaceMemberToDTO(member, user, role);
    });
    if (!dto) return;
    this.hub.broadcast(channels.workspace(event.workspaceId), {
      type: "workspace.member.joined",
      member: dto,
    });
  },
);`}
      </DocsCodeBlock>

      <DocsH2>Testing</DocsH2>
      <DocsP>
        Service tests don't need a database. Swap in in-memory repositories
        and a <DocsCode>RecordingEventBus</DocsCode>, run the service, and
        assert on the events:
      </DocsP>
      <DocsCodeBlock>
        {`const bus = new RecordingEventBus();
const uow = new InMemoryUnitOfWork(bus);

await service.execute({ userId, workspaceId });

expect(bus.events).toEqual([
  expect.objectContaining({ type: "workspaces.member.joined", userId }),
]);`}
      </DocsCodeBlock>
    </DocsLayout>
  );
}
