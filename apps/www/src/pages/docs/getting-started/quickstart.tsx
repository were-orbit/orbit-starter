import {
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsLayout,
  DocsList,
  DocsP,
} from "@/components/docs-layout";
import { OrmInline } from "@/components/orm-tabs";
import { Link } from "@tanstack/react-router";

export const meta = {
  title: "Quickstart",
  description:
    "Ship a running Orbit dashboard in under 5 minutes. Three commands, and npm run setup handles everything else — Postgres, env files, migrations, even generating a better-auth secret.",
};

export function QuickstartPage() {
  return (
    <DocsLayout
      kicker="01 · Getting started"
      title={meta.title}
      description={meta.description}
      path="/docs/getting-started/quickstart"
    >
      <DocsH2>Prerequisites</DocsH2>
      <DocsP>
        Node 20+ and either Docker (for the bundled local Postgres) or a
        Postgres instance you already have reachable.
      </DocsP>

      <DocsH2>Three commands</DocsH2>
      <DocsCodeBlock lang="bash">
        {`git clone https://github.com/were-orbit/orbit-starter.git
cd orbit-starter
npm install && npm run setup
npm run dev`}
      </DocsCodeBlock>

      <DocsH2>What <DocsCode>npm run setup</DocsCode> does</DocsH2>
      <DocsList>
        <li>
          Checks Node version and Postgres reachability (offers to start the
          bundled docker compose if not).
        </li>
        <li>
          Copies <DocsCode>.env.example</DocsCode> to <DocsCode>.env</DocsCode>{" "}
          for each app and prompts for any values you need to fill.
        </li>
        <li>
          Auto-generates HMAC secrets (<DocsCode>BETTER_AUTH_SECRET</DocsCode>,
          etc.) so you don't have to.
        </li>
        <li>
          Runs migrations and regenerates the client — detects which ORM
          your scaffold uses and runs{" "}
          <OrmInline
            prisma={
              <>
                <DocsCode>prisma migrate deploy</DocsCode> +{" "}
                <DocsCode>prisma generate</DocsCode>
              </>
            }
            drizzle={<DocsCode>drizzle-kit migrate</DocsCode>}
          />{" "}
          automatically.
        </li>
        <li>Offers to seed a demo workspace.</li>
      </DocsList>

      <DocsH2>Next</DocsH2>
      <DocsList>
        <li>
          <Link
            to="/docs/getting-started/prerequisites"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Prerequisites
          </Link>{" "}
          — more detail on what you need installed.
        </li>
        <li>
          <Link
            to="/docs/getting-started/environment-variables"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Environment variables
          </Link>{" "}
          — every knob the kit exposes.
        </li>
        <li>
          <Link
            to="/docs/integrations/oauth"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            OAuth
          </Link>{" "}
          — wiring up Google / Apple.
        </li>
        <li>
          <Link
            to="/docs/integrations/billing"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Billing
          </Link>{" "}
          — Stripe / Polar / Dodo setup.
        </li>
      </DocsList>
    </DocsLayout>
  );
}
