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
  title: "Deploy the web shells",
  description:
    "SSR Node server for TanStack Start. Node or edge for Next. Two env vars, baked at build.",
};

export function DeployWebPage() {
  return (
    <DocsLayout
      kicker="06 · Deploy"
      title={meta.title}
      description={meta.description}
      path="/docs/deploy/web"
    >
      <DocsP>
        The web shells are SSR Node servers — not static sites. They
        authenticate server-side (reading the better-auth session cookie),
        redirect unauthenticated users, and stream the dashboard shell. Both
        TanStack Start and Next 16 produce a Node output you deploy like any
        other long-running service; the marketing site (<DocsCode>@orbit/www</DocsCode>)
        is the same shape.
      </DocsP>

      <DocsH2>Build-time vs runtime env</DocsH2>
      <DocsCallout kind="warn">
        The web shells have <em>build-time</em> env vars — Vite and Next both
        inline <DocsCode>import.meta.env.VITE_*</DocsCode> /{" "}
        <DocsCode>process.env.NEXT_PUBLIC_*</DocsCode> into the client bundle.
        If your API URL changes, you rebuild, not restart.
      </DocsCallout>
      <DocsTable
        columns={["Var", "When", "What it does"]}
        rows={[
          [
            <DocsCode>VITE_API_URL</DocsCode>,
            "build",
            "Base URL for REST + WebSocket. Baked into the client bundle.",
          ],
          [
            <DocsCode>VITE_WEB_URL</DocsCode>,
            "build",
            "Canonical app URL — used in email links, share URLs.",
          ],
          [
            <DocsCode>VITE_WWW_URL</DocsCode>,
            "build",
            "Marketing site URL — used by the web shell's public footer.",
          ],
          [
            <DocsCode>HOST</DocsCode>, "runtime",
            "0.0.0.0 in containers. Defaults to localhost.",
          ],
          [
            <DocsCode>PORT</DocsCode>, "runtime",
            "Whatever your host expects. Dev defaults are 4001 (web-tanstack), 4003 (web-next), and 4000 (www); in production set this to whatever port your platform routes traffic to.",
          ],
        ]}
      />

      <DocsH2>TanStack Start (<DocsCode>@orbit/web-tanstack</DocsCode>)</DocsH2>

      <DocsH3>Build output</DocsH3>
      <DocsP>
        Vite + Nitro produce a <DocsCode>.output</DocsCode> folder with a
        self-contained Node server:
      </DocsP>
      <DocsCodeBlock>
        {`npm run build --workspace=@orbit/web-tanstack
# → apps/web-tanstack/.output/server/index.mjs

# serve it
node apps/web-tanstack/.output/server/index.mjs`}
      </DocsCodeBlock>

      <DocsH3>Dockerfile</DocsH3>
      <DocsP>
        <DocsCode>apps/web-tanstack/Dockerfile</DocsCode> mirrors the API's
        shape: pruner → deps → builder → runtime. The runtime stage only
        carries <DocsCode>.output/</DocsCode> plus prod <DocsCode>node_modules</DocsCode>.
        Entry point is <DocsCode>node ./server/index.mjs</DocsCode>.
      </DocsP>

      <DocsH3>Railway</DocsH3>
      <DocsP>
        <DocsCode>apps/web-tanstack/railway.toml</DocsCode> is wired for a
        standalone service:
      </DocsP>
      <DocsCodeBlock>
        {`[build]
watchPatterns = [
  "package.json", "package-lock.json", "turbo.json",
  "apps/web-tanstack/**", "packages/shared/**", "packages/ui/**",
]
buildCommand = "npm ci && npx turbo run build --filter=@orbit/web-tanstack"

[deploy]
startCommand = "npm run start --workspace=@orbit/web-tanstack"`}
      </DocsCodeBlock>
      <DocsP>
        Set <DocsCode>VITE_API_URL</DocsCode> and{" "}
        <DocsCode>VITE_WWW_URL</DocsCode> as build-time variables in the
        Railway service. Runtime env needs only{" "}
        <DocsCode>HOST=0.0.0.0</DocsCode>;{" "}
        <DocsCode>PORT</DocsCode> is provided by Railway.
      </DocsP>

      <DocsH3>Vercel / Cloudflare / Fly</DocsH3>
      <DocsList>
        <li>
          <strong>Vercel</strong> — install the TanStack Start framework
          preset (or deploy as a Node project). Root directory:{" "}
          <DocsCode>apps/web-tanstack</DocsCode>. Build command:{" "}
          <DocsCode>npm run build --workspace=@orbit/web-tanstack</DocsCode>.
        </li>
        <li>
          <strong>Cloudflare Pages / Workers</strong> — Nitro has Workers
          presets. Use{" "}
          <DocsCode>nitro.preset=cloudflare-pages</DocsCode> in the config; you
          lose Node-only APIs but gain global distribution.
        </li>
        <li>
          <strong>Fly</strong> — <DocsCode>fly launch --no-deploy</DocsCode>,
          point at <DocsCode>apps/web-tanstack/Dockerfile</DocsCode>, expose
          port 4001. Since the bundle is self-contained, single-region is fine.
        </li>
      </DocsList>

      <DocsH2>Next 16 (<DocsCode>@orbit/web-next</DocsCode>)</DocsH2>
      <DocsP>
        If you scaffolded with <DocsCode>--framework=next</DocsCode>, the
        surviving web shell is the Next 16 App Router. Its build output is
        standard:
      </DocsP>
      <DocsCodeBlock>
        {`npm run build --workspace=@orbit/web-next
# → apps/web-next/.next/

# serve it
npm run start --workspace=@orbit/web-next`}
      </DocsCodeBlock>
      <DocsP>
        Vercel is the easiest path — import the repo with{" "}
        <DocsCode>apps/web-next</DocsCode> as the root directory and it's one
        click. For anywhere else, Next's standalone output (
        <DocsCode>output: "standalone"</DocsCode>) produces a minimal server
        you can ship in any Node container.
      </DocsP>
      <DocsCallout>
        Public env vars for Next use the <DocsCode>NEXT_PUBLIC_*</DocsCode>{" "}
        prefix, not <DocsCode>VITE_*</DocsCode>. The CLI sets these correctly
        when it scaffolds Next.
      </DocsCallout>

      <DocsH2>Marketing site (<DocsCode>@orbit/www</DocsCode>)</DocsH2>
      <DocsP>
        Same shape as web-tanstack — TanStack Start + Nitro + Node output.
        Needs exactly one build-time var:{" "}
        <DocsCode>VITE_WEB_URL</DocsCode> (the URL of the authenticated app,
        so "Sign in" and "Get access" point at the right place).
      </DocsP>
      <DocsCodeBlock caption="apps/www/railway.toml">
        {`[build]
buildCommand = "npm ci && npx turbo run build --filter=@orbit/www"

[deploy]
startCommand = "npm run start --workspace=@orbit/www"`}
      </DocsCodeBlock>

      <DocsH2>CORS &amp; cookies — the cross-origin case</DocsH2>
      <DocsP>
        In prod you usually put the API and app on the same apex —{" "}
        <DocsCode>app.example.com</DocsCode> +{" "}
        <DocsCode>api.example.com</DocsCode>. For the session cookie to flow,
        the API needs the app's origin in its allowlist:
      </DocsP>
      <DocsCodeBlock caption="apps/api/.env (prod)">
        {`API_ORIGIN="https://api.example.com"
WEB_ORIGIN="https://app.example.com"
WWW_ORIGIN="https://example.com"
# If you run both web shells against one API:
# ADDITIONAL_WEB_ORIGINS="https://next.example.com"`}
      </DocsCodeBlock>
      <DocsCallout kind="warn">
        Two different root domains (not just subdomains) means cross-site
        cookies — you'll hit SameSite issues. Keep the API and app under a
        shared apex when you can; reverse-proxy the API under the app's
        domain if you can't.
      </DocsCallout>

      <DocsH2>What not to forget</DocsH2>
      <DocsList>
        <li>
          Rebuild the web shells after changing any{" "}
          <DocsCode>VITE_*</DocsCode> or <DocsCode>NEXT_PUBLIC_*</DocsCode>{" "}
          var — the old value is in the bundle.
        </li>
        <li>
          Update OAuth redirect URIs to the prod{" "}
          <DocsCode>API_ORIGIN</DocsCode> (covered on the{" "}
          <em>OAuth providers</em> page).
        </li>
        <li>
          If you're using a CDN in front of the API, configure it to{" "}
          <em>not</em> buffer WebSocket upgrades — or route{" "}
          <DocsCode>/v1/ws</DocsCode> to a WS-capable path.
        </li>
      </DocsList>
    </DocsLayout>
  );
}
