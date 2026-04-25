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

export const meta = {
  title: "npm run dev — what's happening?",
  description: "Four processes, three ports, one Turbo pipeline.",
};

export function DevServerPage() {
  return (
    <DocsLayout
      kicker="01 · Getting started"
      title={meta.title}
      description={meta.description}
      path="/docs/getting-started/dev-server"
    >
      <DocsCodeBlock lang="bash">npm run dev</DocsCodeBlock>
      <DocsP>
        The root <DocsCode>dev</DocsCode> script is a one-line alias for{" "}
        <DocsCode>turbo run dev</DocsCode>. Turbo finds every workspace that
        defines a <DocsCode>dev</DocsCode> task and runs them in parallel.
        Here's what comes up:
      </DocsP>

      <DocsTable
        columns={["Workspace", "Port", "Command", "What it is"]}
        rows={[
          [
            <DocsCode>@orbit/api</DocsCode>,
            "4002",
            <DocsCode>tsx watch src/index.ts</DocsCode>,
            "Hono REST + WebSocket server.",
          ],
          [
            <DocsCode>@orbit/web-tanstack</DocsCode>,
            "4001",
            <DocsCode>vite --port 4001</DocsCode>,
            "Authenticated app (TanStack Start + React 19).",
          ],
          [
            <DocsCode>@orbit/web-next</DocsCode>,
            "4003",
            <DocsCode>next dev --turbopack --port 4003</DocsCode>,
            "Authenticated app (Next 16 + React 19).",
          ],
          [
            <DocsCode>@orbit/www</DocsCode>,
            "4000",
            <DocsCode>vite dev --port 4000</DocsCode>,
            "Marketing site — this page.",
          ],
          [
            <DocsCode>@orbit/webhook-tunnel</DocsCode>,
            "—",
            "Node forwarder",
            "Only runs if SMEE_URL is set. Forwards smee.io POSTs to the local API.",
          ],
        ]}
      />
      <DocsCallout>
        You almost never need all four apps running at once. Use the
        per-workspace shortcuts below to trim what comes up.
      </DocsCallout>

      <DocsH2>Running a subset</DocsH2>
      <DocsP>
        The root <DocsCode>package.json</DocsCode> ships these filtered
        shortcuts:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>npm run dev:api</DocsCode> — API only (port 4002).
        </li>
        <li>
          <DocsCode>npm run dev:web</DocsCode> — whichever web shell the CLI
          kept (the create-orb scaffold repoints this to the surviving app).
        </li>
        <li>
          <DocsCode>npm run dev:web-tanstack</DocsCode> — the TanStack shell.
        </li>
        <li>
          <DocsCode>npm run dev:web-next</DocsCode> — the Next shell.
        </li>
        <li>
          <DocsCode>npm run dev:www</DocsCode> — the marketing site only.
        </li>
      </DocsList>

      <DocsH2>What starts in what order</DocsH2>
      <DocsP>
        Turbo runs every <DocsCode>dev</DocsCode> task in parallel — there's no
        declared dependency between them. In practice the API is usually ready
        a second or two after the web shells, which is fine: React Query
        retries failed requests, and the TanStack shell waits on the first
        session fetch before rendering.
      </DocsP>
      <DocsP>
        If you want a hard boot order (e.g. in CI or a container health
        check), use the per-workspace scripts and chain them yourself.
      </DocsP>

      <DocsH2>What you're actually getting</DocsH2>

      <DocsH3>The API (:4002)</DocsH3>
      <DocsList>
        <li>
          Hono HTTP server under <DocsCode>tsx watch</DocsCode>, hot-reloading
          on every TS save.
        </li>
        <li>
          WebSocket server on <DocsCode>/v1/ws</DocsCode> — see{" "}
          <em>Realtime &amp; presence</em> under Concepts.
        </li>
        <li>
          If <DocsCode>JOBS_PROVIDER=graphile</DocsCode>, a co-located
          graphile-worker loop starts alongside the HTTP server.
        </li>
        <li>
          If billing is on, Stripe / Polar / Dodo webhook routes wait at{" "}
          <DocsCode>/v1/billing/webhooks/&lt;provider&gt;</DocsCode>.
        </li>
      </DocsList>

      <DocsH3>The web shells (:4001 or :4003)</DocsH3>
      <DocsP>
        You'll have exactly one of these after scaffolding — the CLI strips
        whichever app you didn't pick. Both shells point at the API via{" "}
        <DocsCode>VITE_API_URL</DocsCode> (or its Next-equivalent) at build
        time. To run both against one API, set{" "}
        <DocsCode>ADDITIONAL_WEB_ORIGINS=http://localhost:4003</DocsCode> in{" "}
        <DocsCode>apps/api/.env</DocsCode> so the CORS allowlist and better-auth
        cookie policy both trust them.
      </DocsP>

      <DocsH3>The marketing site (:4000)</DocsH3>
      <DocsP>
        TanStack Start too, but unauthenticated and short. "Get access" links
        over to the web shell's request-access page using{" "}
        <DocsCode>VITE_WEB_URL</DocsCode>.
      </DocsP>

      <DocsH3>The webhook tunnel</DocsH3>
      <DocsP>
        Only runs when <DocsCode>SMEE_URL</DocsCode> is set. Covered in
        detail in <em>apps/webhook-tunnel/README.md</em>. Short version:
      </DocsP>
      <DocsList ordered>
        <li>
          Visit <DocsCode>https://smee.io/new</DocsCode>, copy the URL.
        </li>
        <li>
          Paste it as <DocsCode>SMEE_URL</DocsCode> in{" "}
          <DocsCode>apps/api/.env</DocsCode>.
        </li>
        <li>
          Register that same smee URL as your provider's webhook endpoint.
        </li>
        <li>
          <DocsCode>npm run dev</DocsCode> — the tunnel relays every POST to{" "}
          <DocsCode>{"http://localhost:4002${SMEE_TARGET_PATH}"}</DocsCode>.
        </li>
      </DocsList>

      <DocsH2>Logs and noise</DocsH2>
      <DocsP>
        Turbo prefixes every line with the workspace name in a unique color, so
        interleaved logs stay readable:
      </DocsP>
      <DocsCodeBlock lang="bash">
        {`@orbit/api:dev:   listening on http://localhost:4002
@orbit/web-tanstack:dev:  VITE ready in 312 ms
@orbit/www:dev:   ➜  Local:   http://localhost:4000/`}
      </DocsCodeBlock>

      <DocsH2>Stopping cleanly</DocsH2>
      <DocsP>
        A single <DocsCode>^C</DocsCode> in the terminal where{" "}
        <DocsCode>npm run dev</DocsCode> is running sends SIGINT to every child
        process — Turbo propagates it, tsx cleans up watchers, Vite shuts its
        HMR socket. If ports stay bound after a crash, it's usually a stray{" "}
        <DocsCode>tsx</DocsCode> or <DocsCode>node</DocsCode> — kill by port
        and retry.
      </DocsP>
    </DocsLayout>
  );
}
