import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsLayout,
  DocsList,
  DocsP,
  DocsTable,
} from "@/components/docs-layout";

export const meta = {
  title: "Prerequisites",
  description:
    "A short list of tools you'll need on your machine before running the CLI.",
};

export function PrerequisitesPage() {
  return (
    <DocsLayout
      kicker="01 · Getting started"
      title={meta.title}
      description={meta.description}
      path="/docs/getting-started/prerequisites"
    >
      <DocsTable
        columns={["Tool", "Version", "Notes"]}
        rows={[
          [
            <DocsCode>Node.js</DocsCode>,
            "≥ 18.17",
            "20 or 22 LTS recommended — React 19 and the ORM client use modern APIs.",
          ],
          [
            <DocsCode>npm</DocsCode>,
            "10.9.7",
            <>
              Pinned via the root <DocsCode>packageManager</DocsCode> field. pnpm
              and yarn aren't tested.
            </>,
          ],
          [
            <DocsCode>PostgreSQL</DocsCode>,
            "≥ 14",
            "Not included in docker-compose — point DATABASE_URL at any Postgres.",
          ],
          [
            <DocsCode>Git</DocsCode>,
            "any",
            "The CLI clones the template from GitHub.",
          ],
        ]}
      />

      <DocsH2>Node</DocsH2>
      <DocsP>
        The CLI declares <DocsCode>engines.node &gt;= 18</DocsCode>, but the
        starter uses React 19, a modern ORM client, and native fetch in the
        API — stick to Node 20 or 22 LTS for the smoothest ride.
      </DocsP>
      <DocsP>
        If you're on macOS, the quickest path is{" "}
        <DocsCode>brew install node</DocsCode>. For version management, Volta
        and fnm both work well.
      </DocsP>

      <DocsH2>Package manager</DocsH2>
      <DocsP>
        The repo is pinned to npm via the{" "}
        <DocsCode>"packageManager": "npm@10.9.7"</DocsCode> field in the root{" "}
        <DocsCode>package.json</DocsCode>. Every workspace script expects{" "}
        <DocsCode>npm run</DocsCode>, and the lockfile is{" "}
        <DocsCode>package-lock.json</DocsCode>. Turbo drives the workspaces from
        there.
      </DocsP>
      <DocsCallout>
        Nothing stops you from swapping in pnpm or yarn, but you'll be off the
        tested path. Hooks, turbo filters, and the workspace layout were all
        written against npm.
      </DocsCallout>

      <DocsH2>PostgreSQL</DocsH2>
      <DocsP>
        Orbit's <DocsCode>docker-compose.yml</DocsCode> intentionally does{" "}
        <em>not</em> ship a Postgres container — you're expected to bring your
        own. In practice that means one of:
      </DocsP>
      <DocsList>
        <li>
          A local Postgres from Homebrew, Postgres.app, or a plain Docker
          container you manage yourself.
        </li>
        <li>
          A managed provider: Neon, Supabase, Railway, Render, or RDS all work
          out of the box.
        </li>
      </DocsList>
      <DocsP>
        Whatever you pick, you'll end up with a URL that looks like this and
        goes into <DocsCode>apps/api/.env</DocsCode>:
      </DocsP>
      <DocsCodeBlock caption="apps/api/.env" lang="bash">
        {`DATABASE_URL="postgresql://postgres@127.0.0.1:5432/orbit?schema=public"`}
      </DocsCodeBlock>
      <DocsCallout kind="warn">
        If your provider uses a transaction pooler (PgBouncer, PlanetScale
        psdb), set <DocsCode>DIRECT_DATABASE_URL</DocsCode> to a non-pooled
        URL as well — migrations (Prisma or drizzle-kit) and graphile-worker
        both need advisory locks and long-lived connections that poolers
        drop.
      </DocsCallout>

      <DocsH2>Git</DocsH2>
      <DocsP>
        The CLI clones{" "}
        <DocsCode>https://github.com/were-orbit/orbit-starter.git</DocsCode> under the
        hood. Any recent <DocsCode>git</DocsCode> version works; you don't need
        an SSH key — the default is an HTTPS clone.
      </DocsP>

      <DocsH2>Optional</DocsH2>
      <DocsList>
        <li>
          <strong>Docker</strong> — only if you want to run the three apps in
          containers via <DocsCode>docker-compose up</DocsCode>. Dev works fine
          without it.
        </li>
        <li>
          <strong>smee.io</strong> — for local Stripe / Polar / Dodo webhook
          forwarding. Covered on the{" "}
          <DocsCode>npm run dev</DocsCode> page.
        </li>
      </DocsList>
    </DocsLayout>
  );
}
