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
  title: "Running the CLI",
  description:
    "One command. A handful of prompts. A project that only ships the features you asked for.",
};

export function RunningTheCliPage() {
  return (
    <DocsLayout
      kicker="01 · Getting started"
      title={meta.title}
      description={meta.description}
      path="/docs/getting-started/running-the-cli"
    >
      <DocsCodeBlock lang="bash">npx create-orb@latest</DocsCodeBlock>
      <DocsP>
        That's it. The CLI greets you, asks where to put the project, walks
        through a short set of feature prompts, and scaffolds a fresh copy of
        the kit into the directory you picked.
      </DocsP>
      <DocsCallout>
        Nothing is written to disk until you confirm the summary at the end —
        a <DocsCode>^C</DocsCode> before that point is a clean no-op.
      </DocsCallout>

      <DocsH2>What the prompts ask</DocsH2>
      <DocsP>
        Say "no" to a feature and the CLI omits every file, env var,
        permission, route, and database model tied to it — the scaffolded
        project only contains what you asked for.
      </DocsP>
      <DocsTable
        columns={["Prompt", "Default", "What it controls"]}
        rows={[
          [
            "Teams + per-team PBAC",
            "on",
            "Nested team scope inside a workspace. Off = workspace-only roles.",
          ],
          [
            "Billing",
            "on",
            <>
              Subscriptions, webhooks, customer portal. If on, you're also
              asked <em>which</em> provider — Stripe, Polar, or Dodo.
            </>,
          ],
          [
            "File uploads",
            "on",
            "UploadThing-backed avatars + image uploads.",
          ],
          [
            "Waitlist / private beta",
            "off",
            "Gates /onboarding behind an allowlist; POST /v1/waitlist still accepts submissions either way.",
          ],
          [
            "Realtime (WebSocket)",
            "on",
            "Presence, live updates, the /v1/ws endpoint.",
          ],
          [
            "Resend email adapter",
            "on",
            "Off ships the ConsoleMailer, which logs magic links to stdout.",
          ],
          [
            "OAuth (Google + Apple)",
            "on",
            "Off keeps magic-link-only sign-in.",
          ],
          [
            "Background jobs + cron",
            "on",
            <>
              Provider-neutral queue. If on, you're asked whether to use{" "}
              <DocsCode>graphile-worker</DocsCode> or Upstash{" "}
              <DocsCode>QStash</DocsCode>.
            </>,
          ],
          [
            "Web framework",
            "TanStack",
            "Pick TanStack Start (Vite, :4001) or Next 16 App Router (:4003). The other app folder is removed.",
          ],
          [
            "ORM",
            "Prisma",
            <>
              Pick Prisma (free default) or Drizzle (paid). The unchosen
              adapter, repositories, and migration tooling are removed.
            </>,
          ],
        ]}
      />

      <DocsH2>Non-interactive mode</DocsH2>
      <DocsP>
        Every prompt has a corresponding flag, and <DocsCode>--yes</DocsCode>{" "}
        accepts every default. Useful for CI, scripted spin-ups, and regenerating
        the same variant over and over:
      </DocsP>
      <DocsCodeBlock lang="bash">
        {`npx create-orb@latest ./my-app --yes \\
  --no-teams \\
  --billing-provider=polar \\
  --framework=next \\
  --jobs-provider=qstash`}
      </DocsCodeBlock>
      <DocsP>
        Run <DocsCode>npx create-orb@latest --help</DocsCode> for the full
        list of flags.
      </DocsP>

      <DocsH2>What actually happens</DocsH2>
      <DocsList ordered>
        <li>
          <strong>Template acquisition.</strong> The CLI either clones{" "}
          <DocsCode>github.com/were-orbit/orbit-starter</DocsCode> (default) or copies
          a local path you passed with <DocsCode>--from</DocsCode>. The target
          directory must be empty or not yet exist.
        </li>
        <li>
          <strong>Strip pass.</strong> The CLI removes every file, code
          section, and dependency tied to a feature you turned off, then
          writes the slimmed-down project to disk.
        </li>
        <li>
          <strong>Script repoint.</strong> If you picked Next, the CLI rewrites
          the root <DocsCode>dev:web</DocsCode> script to target{" "}
          <DocsCode>@orbit/web-next</DocsCode> and drops the stale{" "}
          <DocsCode>dev:web-tanstack</DocsCode> shortcut. TanStack is the no-op
          default.
        </li>
        <li>
          <strong>Install (optional).</strong>{" "}
          <DocsCode>npm install</DocsCode> runs for you unless you pass{" "}
          <DocsCode>--no-install</DocsCode>.
        </li>
      </DocsList>

      <DocsH2>Next steps</DocsH2>
      <DocsP>The CLI prints these at the end. Follow them in order:</DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock lang="bash">
            {`cd my-app
npm install    # if you passed --no-install
cp apps/api/.env.example apps/api/.env   # fill in secrets
npm run prisma:migrate
npm run dev`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock lang="bash">
            {`cd my-app
npm install    # if you passed --no-install
cp apps/api/.env.example apps/api/.env   # fill in secrets
npm run drizzle:migrate
npm run dev`}
          </DocsCodeBlock>
        }
      />

      <DocsH3>Re-running the CLI</DocsH3>
      <DocsP>
        The CLI is one-shot: it scaffolds a new project, it doesn't patch an
        existing one. If you wish you'd kept billing on, it's easier to diff
        against a second scaffold than to rerun the tool against the same
        directory.
      </DocsP>
    </DocsLayout>
  );
}
