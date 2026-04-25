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
import { OrmTabs } from "@/components/orm-tabs";

export const meta = {
  title: "ORM: Prisma or Drizzle",
  description:
    "One repository port per aggregate. Two interchangeable ORMs behind it. Picked once at scaffold time.",
};

export function OrmIntegrationsPage() {
  return (
    <DocsLayout
      kicker="05 · Integrations"
      title={meta.title}
      description={meta.description}
      path="/docs/integrations/orm"
    >
      <DocsP>
        Orbit ships with two database access layers:{" "}
        <strong>Prisma</strong> (the default free track) and{" "}
        <strong>Drizzle</strong> (a paid track). Both sit behind the same
        repository interfaces in <DocsCode>domain/</DocsCode>, so the
        application and domain layers never import an ORM. Swapping between
        them is a scaffold-time choice — the CLI strips the one you didn't
        pick, and the generated project ships with a single, consistent
        stack.
      </DocsP>

      <DocsCallout kind="note">
        <strong>Scaffold-time, not runtime.</strong> The ORM choice isn't a
        runtime flag. When you run{" "}
        <DocsCode>create-orb my-app --orm-provider=drizzle</DocsCode>, the
        CLI deletes every Prisma file, fenced block, and dependency.
        Generated projects only carry the one ORM they use.
      </DocsCallout>

      <DocsCallout kind="note">
        <strong>Pick a track and the rest of the docs follow.</strong> Use
        the Prisma / Drizzle tabs on any page — your choice is remembered in
        this browser, so commands and code samples across the whole docs
        tree default to the ORM you picked. Switch at any time.
      </DocsCallout>

      <DocsH2>Picking an ORM</DocsH2>
      <DocsTable
        columns={["Option", "Tier", "When to pick it"]}
        rows={[
          [
            <DocsCode>prisma</DocsCode>,
            <>Free (default)</>,
            "Excellent type safety, DMMF-driven client, mature migrations, the path every Orbit guide assumes. Pick this unless you have a reason not to.",
          ],
          [
            <DocsCode>drizzle</DocsCode>,
            <>Paid</>,
            "SQL-first query builder, smaller runtime, closer to raw SQL for people who want it. Same repository surface area — no application-code changes.",
          ],
        ]}
      />

      <DocsH2>CLI usage</DocsH2>
      <OrmTabs
        prisma={
          <DocsCodeBlock caption="scaffold with Prisma (default)">
            {`create-orb my-app
# or explicit
create-orb my-app --orm-provider=prisma`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock caption="scaffold with Drizzle (paid)">
            {`create-orb my-app --orm-provider=drizzle`}
          </DocsCodeBlock>
        }
      />
      <DocsP>
        The <DocsCode>--orm-provider</DocsCode> flag maps to the{" "}
        <DocsCode>orm.provider</DocsCode> option in{" "}
        <DocsCode>features.json</DocsCode>. Picking <DocsCode>drizzle</DocsCode>{" "}
        enables the <DocsCode>orm-drizzle</DocsCode> sub-feature (paid) and
        strips <DocsCode>orm-prisma</DocsCode>, including the{" "}
        <DocsCode>apps/api/prisma/</DocsCode> directory, the generated
        client, and every <DocsCode>Prisma*Repository</DocsCode> file.
      </DocsP>

      <DocsH2>What stays the same</DocsH2>
      <DocsP>
        Domain and application code is identical across both tracks — the
        repository interfaces are the contract, and they don't care which
        ORM implements them.
      </DocsP>
      <DocsCodeBlock caption="domain code runs unchanged on either track">
        {`await uow.run(async (tx) => {
  const user = await tx.users.findById(userId);
  if (!user) throw new Error("not found");
  user.rename("New name");
  await tx.users.save(user);
});`}
      </DocsCodeBlock>
      <DocsList>
        <li>
          <DocsCode>TxContext</DocsCode> exposes the same repository ports
          (<DocsCode>users</DocsCode>, <DocsCode>workspaces</DocsCode>, …).
        </li>
        <li>
          Domain events, projectors, and the <DocsCode>UnitOfWork</DocsCode>{" "}
          semantics are identical — both adapters extend a shared{" "}
          <DocsCode>BaseUnitOfWork</DocsCode>.
        </li>
        <li>
          better-auth swaps <DocsCode>@better-auth/prisma-adapter</DocsCode>{" "}
          ↔ <DocsCode>@better-auth/drizzle-adapter</DocsCode> automatically
          — the adapter site is fenced in{" "}
          <DocsCode>interfaces/http/better-auth.ts</DocsCode>.
        </li>
      </DocsList>

      <DocsH2>What differs</DocsH2>
      <DocsH3>Schema source of truth</DocsH3>
      <DocsP>
        The <DocsCode>prisma/schema.prisma</DocsCode> file remains the single
        source of truth for column definitions even on the Drizzle track.
        The Drizzle schema in <DocsCode>src/db/drizzle/schema.ts</DocsCode>{" "}
        mirrors it one-to-one — when you add a column, update both files.
        This keeps the mental model simple: schema lives in one place, two
        ORMs know how to read it.
      </DocsP>

      <DocsH3>Migration commands</DocsH3>
      <DocsTable
        columns={["Task", "Prisma", "Drizzle"]}
        rows={[
          [
            "Generate client / types",
            <DocsCode>npm run prisma:generate</DocsCode>,
            <>
              Types are auto-inferred from{" "}
              <DocsCode>src/db/drizzle/schema.ts</DocsCode>
            </>,
          ],
          [
            "Create a migration",
            <DocsCode>npm run prisma:migrate</DocsCode>,
            <DocsCode>npm run drizzle:generate</DocsCode>,
          ],
          [
            "Apply pending migrations",
            <DocsCode>npm run prisma:migrate</DocsCode>,
            <DocsCode>npm run drizzle:migrate</DocsCode>,
          ],
          [
            "Reset local DB",
            <DocsCode>npm run prisma:reset</DocsCode>,
            <>
              <DocsCode>drizzle-kit drop</DocsCode> + re-run migrate
            </>,
          ],
          [
            "Inspect in GUI",
            <DocsCode>npx prisma studio</DocsCode>,
            <DocsCode>npm run drizzle:studio</DocsCode>,
          ],
        ]}
      />

      <DocsH3>ID generation</DocsH3>
      <DocsP>
        Prisma uses a <DocsCode>$extends</DocsCode> client hook to auto-fill
        prefixed UUIDv7 ids on <DocsCode>create</DocsCode> /{" "}
        <DocsCode>createMany</DocsCode>. Drizzle doesn't have an equivalent,
        so Drizzle repositories call{" "}
        <DocsCode>newId("user")</DocsCode> (etc.) explicitly before{" "}
        <DocsCode>db.insert(...)</DocsCode>. The net effect is the same —
        every row gets a typed, prefixed id — but the mechanism is
        explicit on the Drizzle side.
      </DocsP>

      <DocsH2>Under the hood</DocsH2>
      <DocsCodeBlock caption="apps/api/src/kernel/base-uow.ts — the shared base">
        {`export abstract class BaseUnitOfWork<TxHandle> implements UnitOfWork {
  constructor(protected readonly bus: EventBus) {}

  protected abstract openTransaction<T>(fn: (h: TxHandle) => Promise<T>): Promise<T>;
  protected abstract buildContext(handle: TxHandle): RepoContext;
  protected abstract readHandle(): TxHandle;

  async run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> { /* shared */ }
  async read<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> { /* shared */ }
}`}
      </DocsCodeBlock>
      <DocsP>
        Both <DocsCode>PrismaUnitOfWork</DocsCode> and{" "}
        <DocsCode>DrizzleUnitOfWork</DocsCode> extend this class and supply
        three small methods: how to open a transaction, how to build a
        repository context from a transactional handle, and how to return a
        non-transactional handle for reads. Event collection, read-only
        guards, and post-commit dispatch are inherited — the semantics are
        guaranteed identical between the two.
      </DocsP>

      <DocsH2>Files added / changed by the Drizzle strip</DocsH2>
      <DocsList>
        <li>
          <DocsCode>apps/api/drizzle/</DocsCode> — drizzle-kit config and
          migrations folder.
        </li>
        <li>
          <DocsCode>apps/api/src/db/drizzle/schema.ts</DocsCode> — schema
          definitions mirroring the Prisma models.
        </li>
        <li>
          <DocsCode>apps/api/src/infrastructure/drizzle.ts</DocsCode> and{" "}
          <DocsCode>drizzle-uow.ts</DocsCode> — client + unit of work.
        </li>
        <li>
          <DocsCode>apps/api/src/**/infrastructure/drizzle-*.repository.ts</DocsCode>{" "}
          — one file per repository interface.
        </li>
        <li>
          npm scripts: <DocsCode>drizzle:generate</DocsCode>,{" "}
          <DocsCode>drizzle:migrate</DocsCode>,{" "}
          <DocsCode>drizzle:push</DocsCode>,{" "}
          <DocsCode>drizzle:studio</DocsCode>.
        </li>
      </DocsList>

      <DocsH2>Switching from Prisma to Drizzle later</DocsH2>
      <DocsP>
        If you scaffolded with Prisma and want to move to Drizzle on an
        existing project, there's no "swap" command — scaffold a fresh
        project with <DocsCode>--orm-provider=drizzle</DocsCode>, point it at
        your existing database, and copy over your domain, application, and
        interface code (none of which depend on the ORM). Drizzle's{" "}
        <DocsCode>drizzle-kit pull</DocsCode> can introspect an existing
        database if you want to verify the schemas match.
      </DocsP>

      <DocsCallout kind="note">
        <strong>Both tracks share these tests.</strong> The test suite in{" "}
        <DocsCode>apps/api/src/**/*.test.ts</DocsCode> exercises services
        through <DocsCode>UnitOfWork</DocsCode> so the same tests cover
        both ORM paths — the adapter under the port is irrelevant.
      </DocsCallout>
    </DocsLayout>
  );
}
