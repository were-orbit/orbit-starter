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
  title: "Postgres providers",
  description:
    "Any modern Postgres works. The only footgun is transaction poolers — reach for DIRECT_DATABASE_URL when you hit one.",
};

export function DeployPostgresPage() {
  return (
    <DocsLayout
      kicker="06 · Deploy"
      title={meta.title}
      description={meta.description}
      path="/docs/deploy/postgres"
    >
      <DocsP>
        Orbit's only hard database requirement is PostgreSQL 14+ (the kit
        uses <DocsCode>WITH (auto_vacuum = ...)</DocsCode>-style features and
        Postgres-specific JSON operators). It does <em>not</em> ship its own
        database — <DocsCode>docker-compose.yml</DocsCode> leaves{" "}
        <DocsCode>DATABASE_URL</DocsCode> external on purpose. Pick a
        provider, point at it.
      </DocsP>

      <DocsH2>The env vars</DocsH2>
      <DocsTable
        columns={["Var", "Who reads it", "When to set it"]}
        rows={[
          [
            <DocsCode>DATABASE_URL</DocsCode>,
            "API runtime, migration tooling at build time, graphile-worker by default",
            "Always.",
          ],
          [
            <DocsCode>DIRECT_DATABASE_URL</DocsCode>,
            "Migration CLI (Prisma or drizzle-kit)",
            <>
              Only when <DocsCode>DATABASE_URL</DocsCode> is a transaction
              pooler. Skip if you're hitting Postgres directly.
            </>,
          ],
          [
            <DocsCode>WORKER_DATABASE_URL</DocsCode>,
            "graphile-worker (jobs)",
            <>
              Only when using graphile with a pooler upstream — workers need
              LISTEN/NOTIFY which poolers drop.
            </>,
          ],
        ]}
      />
      <DocsCallout>
        If you're not using graphile-worker (i.e.{" "}
        <DocsCode>JOBS_PROVIDER=qstash</DocsCode> or unset), you can ignore{" "}
        <DocsCode>WORKER_DATABASE_URL</DocsCode> entirely.
      </DocsCallout>

      <DocsH2>Provider recipes</DocsH2>

      <DocsH3>Neon</DocsH3>
      <DocsP>
        Serverless Postgres. The pooled and direct URLs are separate endpoints
        on the same database:
      </DocsP>
      <DocsCodeBlock caption="apps/api/.env (prod)">
        {`# Pooled connection (PgBouncer in transaction mode, port 5432)
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/orbit?sslmode=require"

# Direct connection for migrations + graphile LISTEN/NOTIFY
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/orbit?sslmode=require"
WORKER_DATABASE_URL="\${DIRECT_DATABASE_URL}"`}
      </DocsCodeBlock>
      <DocsP>
        Neon's pooler is the right thing to use at runtime (serverless-friendly
        connection counts), but migration tooling needs a direct session for
        advisory locks. The setup above covers both.
      </DocsP>

      <DocsH3>Supabase</DocsH3>
      <DocsP>
        Same shape as Neon. Supabase exposes a pooler (Supavisor) on port{" "}
        <DocsCode>6543</DocsCode> and direct access on{" "}
        <DocsCode>5432</DocsCode>:
      </DocsP>
      <DocsCodeBlock>
        {`DATABASE_URL="postgresql://postgres.xxx:pass@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"
WORKER_DATABASE_URL="\${DIRECT_DATABASE_URL}"`}
      </DocsCodeBlock>
      <DocsCallout kind="warn">
        Supabase pooler URLs require <DocsCode>?pgbouncer=true</DocsCode> —
        the Prisma client uses it to disable prepared statements, which
        PgBouncer in transaction mode doesn't support. The Drizzle
        <DocsCode>postgres</DocsCode> / <DocsCode>pg</DocsCode> drivers are
        not affected, but the flag is harmless to leave in place.
      </DocsCallout>

      <DocsH3>AWS RDS / Aurora</DocsH3>
      <DocsP>
        RDS doesn't front with a pooler by default — the direct URL works for
        both runtime and migrations. Set only{" "}
        <DocsCode>DATABASE_URL</DocsCode>, skip the others:
      </DocsP>
      <DocsCodeBlock>
        {`DATABASE_URL="postgresql://orbit:pass@orbit-prod.xxxx.us-east-1.rds.amazonaws.com:5432/orbit?sslmode=verify-full"`}
      </DocsCodeBlock>
      <DocsP>
        If you're using RDS Proxy (transaction mode), add{" "}
        <DocsCode>DIRECT_DATABASE_URL</DocsCode> pointing at the cluster
        endpoint directly.
      </DocsP>

      <DocsH3>Railway Postgres</DocsH3>
      <DocsP>
        The in-project Postgres add-on exposes both a public{" "}
        <DocsCode>DATABASE_PUBLIC_URL</DocsCode> and an internal-network{" "}
        <DocsCode>DATABASE_URL</DocsCode>. Use the internal one for the
        deployed API, the public one for local ops (running migrations from
        your laptop, ad-hoc queries). No pooler, so the direct-URL dance
        doesn't apply.
      </DocsP>

      <DocsH3>Fly Postgres</DocsH3>
      <DocsP>
        Fly-managed Postgres sits inside the Fly private network. No pooler
        by default; reach it via <DocsCode>top1.nearest.of.&lt;app&gt;.internal</DocsCode>.
        The one wrinkle: Fly's backup semantics are more DIY than Neon or
        Supabase — read their operator docs before going to production.
      </DocsP>

      <DocsH2>When you actually need a pooler</DocsH2>
      <DocsP>
        The ORM client holds a connection per in-flight operation. Under
        load, a direct connection model hits Postgres's{" "}
        <DocsCode>max_connections</DocsCode> quickly — especially on
        cheaper plans where it's 50 or 100. A
        transaction pooler lets 100 ORM calls share 10 backend connections.
      </DocsP>
      <DocsList>
        <li>
          <strong>Neon, Supabase, Vercel Postgres</strong> — pooler included.
        </li>
        <li>
          <strong>RDS, Fly Postgres, self-hosted</strong> — add PgBouncer
          yourself, or size the DB up enough that you don't need to.
        </li>
      </DocsList>

      <DocsH2>Migrations in prod</DocsH2>
      <OrmTabs
        prisma={
          <>
            <DocsP>
              Never run <DocsCode>prisma migrate dev</DocsCode> against
              production — it's interactive and can drop data. Use{" "}
              <DocsCode>prisma migrate deploy</DocsCode>, which only applies
              already-generated migrations:
            </DocsP>
            <DocsCodeBlock lang="bash">
              {`npm exec --workspace=@orbit/api prisma migrate deploy`}
            </DocsCodeBlock>
          </>
        }
        drizzle={
          <>
            <DocsP>
              Never run <DocsCode>drizzle-kit push</DocsCode> against
              production — it applies schema diffs without creating a
              migration file, so you lose the audit trail. Use{" "}
              <DocsCode>drizzle-kit migrate</DocsCode>, which only applies
              already-generated <DocsCode>.sql</DocsCode> files under{" "}
              <DocsCode>apps/api/drizzle/migrations/</DocsCode>:
            </DocsP>
            <DocsCodeBlock lang="bash">
              {`npm exec --workspace=@orbit/api drizzle-kit migrate --config=drizzle/drizzle.config.ts`}
            </DocsCodeBlock>
          </>
        }
      />
      <DocsP>
        The API's Dockerfile has a <DocsCode>migrate</DocsCode> stage that
        runs exactly this command; docker-compose sequences it before the
        API via <DocsCode>service_completed_successfully</DocsCode>, and
        Railway's <DocsCode>preDeployCommand</DocsCode> does the same. For
        anywhere else, run it as a pre-deploy step — not at container
        start, to avoid races between replicas.
      </DocsP>

      <DocsH2>Backups &amp; PITR</DocsH2>
      <DocsP>
        Out of scope for Orbit, but worth saying: PITR is table-stakes the
        moment you have real users. Neon and Supabase bill for it; RDS does
        it via snapshots and WAL archival; self-hosted means running{" "}
        <DocsCode>pgBackRest</DocsCode> or similar. If your provider doesn't
        offer PITR on the plan you're on, upgrade before you launch.
      </DocsP>

      <DocsH2>Extensions</DocsH2>
      <DocsP>
        The stock kit uses no extensions beyond what the ORM needs. If you add
        pgvector, pg_trgm, or timescaledb for feature work, document them in
        a migration (<DocsCode>CREATE EXTENSION IF NOT EXISTS ...</DocsCode>)
        so the migrate stage provisions them on every environment.
      </DocsP>
    </DocsLayout>
  );
}
