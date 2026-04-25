import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
  DocsTable,
} from "@/components/docs-layout";
import { OrmInline, OrmTabs } from "@/components/orm-tabs";

export const meta = {
  title: "Bounded contexts & DDD layering",
  description:
    "Each piece of the product is a folder. Each folder has the same three layers. Every context looks alike.",
};

export function BoundedContextsPage() {
  return (
    <DocsLayout
      kicker="02 · Concepts"
      title={meta.title}
      description={meta.description}
      path="/docs/concepts/bounded-contexts"
    >
      <DocsP>
        The API is organized as a set of <strong>bounded contexts</strong> — one
        folder per domain — each with the same internal shape. The shape is the
        point: once you've written one context, you've written them all. When
        you add a new one, you paste in the same three layers and get type
        safety, a repository port, the Unit of Work, and realtime dispatch for
        free.
      </DocsP>

      <DocsH2>The contexts</DocsH2>
      <DocsTable
        columns={["Folder", "Responsibility"]}
        rows={[
          [<DocsCode>identity/</DocsCode>, "Users, sessions, accounts, verification."],
          [<DocsCode>workspaces/</DocsCode>, "Workspaces, members, roles, invites. Owns PBAC at the workspace scope."],
          [<DocsCode>teams/</DocsCode>, "Teams, team members, team roles. Nested inside a workspace. Optional."],
          [<DocsCode>billing/</DocsCode>, "Billing customers, subscriptions, webhooks. Optional."],
          [<DocsCode>uploads/</DocsCode>, "Signed upload endpoints and UploadThing adapter. Optional."],
          [<DocsCode>waitlist/</DocsCode>, "Waitlist entries + admin acceptance. Optional."],
          [<DocsCode>jobs/</DocsCode>, "Background job scheduling — provider-agnostic queue + runtime."],
        ]}
      />

      <DocsH2>Cross-cutting concerns</DocsH2>
      <DocsP>
        Things that every context uses live at the top level of{" "}
        <DocsCode>apps/api/src/</DocsCode>:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>kernel/</DocsCode> — <DocsCode>Clock</DocsCode>,{" "}
          <DocsCode>EventBus</DocsCode>, <DocsCode>UnitOfWork</DocsCode>,{" "}
          <DocsCode>Result&lt;T&gt;</DocsCode>, <DocsCode>DomainError</DocsCode>,
          and branded <DocsCode>Id&lt;K&gt;</DocsCode> types.
        </li>
        <li>
          <DocsCode>realtime/</DocsCode> — in-process pub/sub hub + presence
          tracker + the projectors that fan domain events out to WebSocket
          subscribers.
        </li>
        <li>
          <DocsCode>infrastructure/</DocsCode> — ORM client, UoW impl, the
          Resend mailer, the UploadThing client, etc.
        </li>
        <li>
          <DocsCode>interfaces/</DocsCode> — the delivery mechanisms: HTTP
          controllers, the WebSocket handler, scheduled job handlers.
        </li>
        <li>
          <DocsCode>composition.ts</DocsCode> — the single file where
          dependencies are wired. Every service, repository, projector, and
          adapter is constructed here.
        </li>
      </DocsList>

      <DocsH2>The three layers, every time</DocsH2>
      <DocsP>
        Open any context folder and you'll see the same three subfolders:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/workspaces/">
        {`workspaces/
├── domain/          # Entities, value objects, events, repository interfaces
├── application/     # Service classes (use cases), projectors
└── infrastructure/  # ORM repositories, adapters`}
      </DocsCodeBlock>

      <DocsH3>Domain</DocsH3>
      <DocsP>
        Aggregates, value objects, domain events, and repository{" "}
        <em>interfaces</em>. No framework imports, no ORM, no Hono — just
        TypeScript that describes the business invariants. Aggregates are
        constructed via named factories (<DocsCode>Workspace.open</DocsCode>,{" "}
        <DocsCode>WorkspaceMember.join</DocsCode>) that enforce invariants
        and enqueue events:
      </DocsP>
      <DocsCodeBlock>
        {`export class Workspace {
  static open(input: { slug, name, ownerId }, clock): Workspace { ... }
  rename(next: string): void { ... }
  pullEvents(): DomainEvent[] { ... }
}`}
      </DocsCodeBlock>

      <DocsH3>Application</DocsH3>
      <DocsP>
        Service classes — one per use case. Each service orchestrates reads
        and writes through the Unit of Work, calls aggregate methods, collects
        their events, and returns a plain result. Nothing here knows about
        HTTP or request shapes:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/workspaces/application/">
        {`create-workspace.service.ts
accept-invite.service.ts
invite-member.service.ts
change-member-role.service.ts
create-role.service.ts
update-role.service.ts
delete-role.service.ts
remove-workspace-member.service.ts
revoke-invite.service.ts
list-members.service.ts
list-roles.service.ts
...`}
      </DocsCodeBlock>
      <DocsP>
        Projectors also live here — classes that subscribe to events on the{" "}
        <DocsCode>EventBus</DocsCode> and push side effects. The realtime
        publisher and the mailer projectors are both structured this way.
      </DocsP>

      <DocsH3>Infrastructure</DocsH3>
      <DocsP>
        ORM-backed implementations of the domain repositories, plus any
        provider adapters that belong to the context. This is the only
        layer that imports the ORM client — a scaffolded project only
        ships the files for the ORM you picked:
      </DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock caption="apps/api/src/workspaces/infrastructure/ (Prisma track)">
            {`prisma-workspace.repository.ts
prisma-workspace-member.repository.ts
prisma-workspace-role.repository.ts
prisma-invite.repository.ts`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock caption="apps/api/src/workspaces/infrastructure/ (Drizzle track)">
            {`drizzle-workspace.repository.ts
drizzle-workspace-member.repository.ts
drizzle-workspace-role.repository.ts
drizzle-invite.repository.ts`}
          </DocsCodeBlock>
        }
      />
      <DocsP>
        Each implements the interface defined in{" "}
        <DocsCode>domain/repositories.ts</DocsCode>, translating between
        database rows and domain aggregates.
      </DocsP>

      <DocsH2>Why this shape?</DocsH2>
      <DocsList>
        <li>
          <strong>The domain survives rewrites.</strong> The Prisma ↔
          Drizzle swap literally is this principle in practice — swap the{" "}
          <DocsCode>infrastructure/</DocsCode> adapters, leave{" "}
          <DocsCode>domain/</DocsCode> and{" "}
          <DocsCode>application/</DocsCode> untouched.
        </li>
        <li>
          <strong>Tests are cheap.</strong> Service tests use a recording event
          bus + in-memory repositories; no containers, no migrations, no mocks.
        </li>
        <li>
          <strong>Adapters are swappable.</strong> Stripe, Polar, and Dodo all
          implement the same <DocsCode>BillingProvider</DocsCode> port. Adding
          a fourth is a new file, not a refactor.
        </li>
        <li>
          <strong>Events are the seam.</strong> Anything that needs to happen
          as a consequence of a domain change — realtime push, an email, a
          downstream update — subscribes to an event rather than being inlined
          into the service that produced it.
        </li>
      </DocsList>

      <DocsH2>Adding a context</DocsH2>
      <DocsP>The mechanical path:</DocsP>
      <DocsList ordered>
        <li>
          Create <DocsCode>src/&lt;name&gt;/{"{domain,application,infrastructure}"}/</DocsCode>.
        </li>
        <li>
          Define your aggregates, events, and repository interfaces in{" "}
          <DocsCode>domain/</DocsCode>.
        </li>
        <li>
          Add the repository to <DocsCode>TxContext</DocsCode> in{" "}
          <DocsCode>kernel/uow.ts</DocsCode> and wire the implementation
          into{" "}
          <OrmInline
            prisma={<DocsCode>infrastructure/prisma-uow.ts</DocsCode>}
            drizzle={<DocsCode>infrastructure/drizzle-uow.ts</DocsCode>}
          />
          .
        </li>
        <li>
          Write services in <DocsCode>application/</DocsCode>; collect events
          via <DocsCode>tx.events.add(...)</DocsCode>.
        </li>
        <li>
          Wire everything in <DocsCode>composition.ts</DocsCode>, and if the
          context has HTTP endpoints, add a controller under{" "}
          <DocsCode>interfaces/http/controllers/</DocsCode>.
        </li>
      </DocsList>
      <DocsCallout>
        The <em>Add a bounded context</em> guide (coming soon) walks through
        a minimal example end-to-end with concrete file diffs.
      </DocsCallout>
    </DocsLayout>
  );
}
