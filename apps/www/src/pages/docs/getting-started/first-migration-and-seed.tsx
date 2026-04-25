import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
} from "@/components/docs-layout";
import { OrmInline, OrmTabs } from "@/components/orm-tabs";

export const meta = {
  title: "First migration + seed",
  description:
    "Get a schema into your Postgres, then drop in just enough rows to log in and click around.",
};

export function FirstMigrationAndSeedPage() {
  return (
    <DocsLayout
      kicker="01 · Getting started"
      title={meta.title}
      description={meta.description}
      path="/docs/getting-started/first-migration-and-seed"
    >
      <DocsH2>Run the first migration</DocsH2>
      <DocsP>
        The schema lives at{" "}
        <OrmInline
          prisma={<DocsCode>apps/api/prisma/schema.prisma</DocsCode>}
          drizzle={<DocsCode>apps/api/src/db/drizzle/schema.ts</DocsCode>}
        />
        . With your <DocsCode>DATABASE_URL</DocsCode> set, apply every
        existing migration from the repo — or generate your first one, if
        you've touched the schema:
      </DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock lang="bash">npm run prisma:migrate</DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock lang="bash">
            {`# generate a new SQL migration from schema edits
npm run drizzle:generate
# apply every pending migration to DATABASE_URL
npm run drizzle:migrate`}
          </DocsCodeBlock>
        }
      />
      <OrmTabs
        prisma={
          <DocsP>
            That's a shortcut for <DocsCode>prisma migrate dev</DocsCode>{" "}
            inside <DocsCode>apps/api</DocsCode>. It creates the tables,
            regenerates the Prisma client, and — if you've edited the
            schema — prompts you for a migration name before writing it to{" "}
            <DocsCode>apps/api/prisma/migrations/</DocsCode>.
          </DocsP>
        }
        drizzle={
          <DocsP>
            <DocsCode>drizzle-kit generate</DocsCode> diffs the current
            schema against the previous one and emits a new SQL file under{" "}
            <DocsCode>apps/api/drizzle/migrations/</DocsCode>.{" "}
            <DocsCode>drizzle-kit migrate</DocsCode> then applies every
            pending file in order. Both commands read{" "}
            <DocsCode>apps/api/drizzle/drizzle.config.ts</DocsCode>.
          </DocsP>
        }
      />
      <OrmTabs
        prisma={
          <DocsCallout>
            If you only changed the schema and want to refresh the
            generated client without creating a new migration, run{" "}
            <DocsCode>npm run prisma:generate</DocsCode>.
          </DocsCallout>
        }
        drizzle={
          <DocsCallout>
            Drizzle's types are inferred directly from{" "}
            <DocsCode>src/db/drizzle/schema.ts</DocsCode> at compile time —
            there's no client-regen step to run between schema edits and
            typecheck.
          </DocsCallout>
        }
      />

      <DocsH3>Starting over</DocsH3>
      <OrmTabs
        prisma={
          <DocsP>
            <DocsCode>npm run prisma:reset</DocsCode> drops the whole
            database and re-runs every migration from zero. Useful when a
            dev dataset drifts, or you want to re-exercise the seed script.
            It's destructive and non-interactive — don't point it at
            anything shared.
          </DocsP>
        }
        drizzle={
          <DocsP>
            Drizzle has no single "reset" command. The simplest equivalent
            is to drop and recreate the database (e.g.{" "}
            <DocsCode>dropdb</DocsCode> + <DocsCode>createdb</DocsCode> if
            you're on local Postgres), then re-run{" "}
            <DocsCode>npm run drizzle:migrate</DocsCode>. Destructive and
            non-interactive — don't point it at anything shared.
          </DocsP>
        }
      />

      <DocsH2>Seed the demo workspace</DocsH2>
      <DocsP>
        Once migrations have run, seed a minimal workspace so you can sign
        in and click through the settings UI:
      </DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock lang="bash">
            npm run db:seed --workspace @orbit/api
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock lang="bash">
            npx tsx apps/api/drizzle/seed.ts
          </DocsCodeBlock>
        }
      />
      <DocsP>
        The seed is idempotent — running it again does nothing. It creates:
      </DocsP>
      <DocsList>
        <li>
          One demo <strong>user</strong> (email{" "}
          <DocsCode>owner@wereorbit.com</DocsCode>, already email-verified).
        </li>
        <li>
          One <strong>workspace</strong> with slug <DocsCode>demo</DocsCode>.
        </li>
        <li>
          Three <strong>system roles</strong>: OWNER, ADMIN, MEMBER — each
          seeded with the default permission set from{" "}
          <DocsCode>@orbit/shared/permissions</DocsCode>.
        </li>
        <li>
          One <strong>workspace member</strong> binding the demo user to the
          OWNER role.
        </li>
      </DocsList>
      <DocsCallout>
        That's it. No teams, no subscriptions, no invites, no waitlist
        entries. Features built on top of the kit should seed themselves
        from their own scripts instead of expanding this one.
      </DocsCallout>

      <DocsH3>Using your own email</DocsH3>
      <DocsP>
        Pass overrides as env vars to the same command — handy when you
        want magic links to actually land in your inbox:
      </DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock lang="bash">
            {`SEED_OWNER_EMAIL=you@yourdomain.com \\
SEED_OWNER_NAME="Your Name" \\
SEED_WORKSPACE_SLUG=acme \\
SEED_WORKSPACE_NAME="Acme" \\
  npm run db:seed --workspace @orbit/api`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock lang="bash">
            {`SEED_OWNER_EMAIL=you@yourdomain.com \\
SEED_OWNER_NAME="Your Name" \\
SEED_WORKSPACE_SLUG=acme \\
SEED_WORKSPACE_NAME="Acme" \\
  npx tsx apps/api/drizzle/seed.ts`}
          </DocsCodeBlock>
        }
      />

      <DocsH2>Signing in</DocsH2>
      <DocsP>
        Start the stack with <DocsCode>npm run dev</DocsCode>, open{" "}
        <DocsCode>http://localhost:4001/login</DocsCode>, and enter the
        seeded email. In dev without <DocsCode>RESEND_API_KEY</DocsCode>,
        the ConsoleMailer logs the magic-link URL to the API's stdout and
        also exposes it at:
      </DocsP>
      <DocsCodeBlock lang="bash">
        GET http://localhost:4002/v1/dev/last-magic-link?email=owner@wereorbit.com
      </DocsCodeBlock>
      <DocsP>
        Open that URL in a browser and you land inside the demo workspace,
        signed in as the owner.
      </DocsP>
    </DocsLayout>
  );
}
