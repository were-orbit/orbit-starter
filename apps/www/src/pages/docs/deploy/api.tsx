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
  title: "Deploy the API",
  description:
    "One Dockerfile, one migrate-then-boot sequence, and a handful of env vars. Any long-lived-container host will do.",
};

export function DeployApiPage() {
  return (
    <DocsLayout
      kicker="06 · Deploy"
      title={meta.title}
      description={meta.description}
      path="/docs/deploy/api"
    >
      <DocsP>
        <DocsCode>apps/api</DocsCode> is a long-running Node process. It
        needs a host that can run a container, hold a WebSocket open, and —
        if you're using graphile-worker — keep a worker loop alive. Fly,
        Railway, Render, Kamal, Cloud Run, or your own VM all fit. Serverless
        targets (Lambda, Vercel Functions) don't, because of the worker + WS.
      </DocsP>

      <DocsH2>The Dockerfile</DocsH2>
      <DocsP>
        <DocsCode>apps/api/Dockerfile</DocsCode> is a multi-stage build. The
        stages worth knowing by name:
      </DocsP>
      <DocsTable
        columns={["Stage", "Purpose"]}
        rows={[
          [<DocsCode>pruner</DocsCode>, <><DocsCode>turbo prune @orbit/api --docker</DocsCode> — narrows the build context to just what the API needs.</>],
          [<DocsCode>deps</DocsCode>, "npm ci with every dependency including devDeps."],
          [<DocsCode>builder</DocsCode>, <><OrmInline prisma={<><DocsCode>prisma generate</DocsCode> + </>} drizzle={<></>} /><DocsCode>tsc</DocsCode> — emits the compiled API.</>],
          [<DocsCode>prod-deps</DocsCode>, <><DocsCode>npm ci --omit=dev</DocsCode> for the final runtime image.</>],
          [<DocsCode>migrate</DocsCode>, <>One-shot entrypoint: <OrmInline prisma={<DocsCode>prisma migrate deploy</DocsCode>} drizzle={<DocsCode>drizzle-kit migrate</DocsCode>} />.</>],
          [<DocsCode>runtime</DocsCode>, <>Default target. <DocsCode>node --import tsx src/index.ts</DocsCode> under <DocsCode>tini</DocsCode>.</>],
        ]}
      />
      <DocsCallout kind="warn">
        Build with the <strong>repo root</strong> as context — not{" "}
        <DocsCode>apps/api</DocsCode> — because turbo prune needs to see the
        workspace topology:
      </DocsCallout>
      <DocsCodeBlock>
        {`# from the repo root
docker build -f apps/api/Dockerfile -t orbit-api .
docker build -f apps/api/Dockerfile --target migrate -t orbit-api-migrate .`}
      </DocsCodeBlock>

      <DocsH2>Migrate, then boot</DocsH2>
      <DocsP>
        Orbit separates migrations from the API process on purpose: running
        them under the API's startup gives you a race when N instances boot
        at once, and ties "deploy failed" to "migration still running." Every
        deploy target gets the same two-step:
      </DocsP>
      <DocsList ordered>
        <li>
          Run the <DocsCode>migrate</DocsCode> image (or the equivalent
          pre-deploy command) to completion.
        </li>
        <li>
          Start the <DocsCode>runtime</DocsCode> image once migrations have
          succeeded.
        </li>
      </DocsList>
      <DocsCodeBlock caption="docker-compose.yml">
        {`services:
  api-migrate:
    build:
      dockerfile: apps/api/Dockerfile
      target: migrate
    restart: "no"

  api:
    build:
      dockerfile: apps/api/Dockerfile
    depends_on:
      api-migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:4002/health').then(r=>process.exit(r.ok?0:1))"]`}
      </DocsCodeBlock>

      <DocsH2>Platform recipes</DocsH2>

      <DocsH3>Railway</DocsH3>
      <DocsP>
        <DocsCode>apps/api/railway.toml</DocsCode> ships with the repo. Point
        a Railway service at that file and you get the right build command,
        pre-deploy migrate, and start command for free:
      </DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock caption="apps/api/railway.toml (Prisma track)">
            {`[build]
watchPatterns = [
  "package.json", "package-lock.json", "turbo.json",
  "apps/api/**", "packages/shared/**",
]
buildCommand = "npm ci && npx turbo run prisma:generate --filter=@orbit/api && npx turbo run build --filter=@orbit/api"

[deploy]
preDeployCommand = "npm exec --workspace=@orbit/api prisma migrate deploy"
startCommand = "npm run start --workspace=@orbit/api"`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock caption="apps/api/railway.toml (Drizzle track)">
            {`[build]
watchPatterns = [
  "package.json", "package-lock.json", "turbo.json",
  "apps/api/**", "packages/shared/**",
]
buildCommand = "npm ci && npx turbo run build --filter=@orbit/api"

[deploy]
preDeployCommand = "npm exec --workspace=@orbit/api drizzle-kit migrate --config=drizzle/drizzle.config.ts"
startCommand = "npm run start --workspace=@orbit/api"`}
          </DocsCodeBlock>
        }
      />
      <DocsP>
        The watch patterns are tight — only rebuild when API or{" "}
        <DocsCode>@orbit/shared</DocsCode> change. Add{" "}
        <DocsCode>packages/ui</DocsCode> to the list if your API imports from
        it; by default it doesn't.
      </DocsP>

      <DocsH3>Fly.io</DocsH3>
      <DocsP>
        Fly doesn't ship a config file with the repo — write one at{" "}
        <DocsCode>fly.toml</DocsCode>:
      </DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock caption="fly.toml (Prisma track)">
            {`# fly.toml (run \`fly launch --no-deploy\` first to scaffold, then edit)
app = "orbit-api"
primary_region = "ord"

[build]
  dockerfile = "apps/api/Dockerfile"

[deploy]
  release_command = "/app/node_modules/.bin/prisma migrate deploy"

[http_service]
  internal_port = 4002
  force_https = true
  auto_stop_machines = false  # keep alive; WS + worker
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  path = "/health"
  interval = "15s"
  grace_period = "30s"`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock caption="fly.toml (Drizzle track)">
            {`# fly.toml (run \`fly launch --no-deploy\` first to scaffold, then edit)
app = "orbit-api"
primary_region = "ord"

[build]
  dockerfile = "apps/api/Dockerfile"

[deploy]
  release_command = "/app/node_modules/.bin/drizzle-kit migrate --config=apps/api/drizzle/drizzle.config.ts"

[http_service]
  internal_port = 4002
  force_https = true
  auto_stop_machines = false  # keep alive; WS + worker
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  path = "/health"
  interval = "15s"
  grace_period = "30s"`}
          </DocsCodeBlock>
        }
      />
      <DocsCallout>
        <DocsCode>auto_stop_machines = false</DocsCode> is load-bearing:
        graphile-worker + the WebSocket server both need the process to stay
        up. Letting Fly scale to zero kills background jobs.
      </DocsCallout>

      <DocsH3>Render</DocsH3>
      <DocsList>
        <li>
          Create a "Web Service" pointing at{" "}
          <DocsCode>apps/api/Dockerfile</DocsCode> with the repo as build
          context.
        </li>
        <li>
          Pre-deploy command:{" "}
          <OrmInline
            prisma={
              <DocsCode>
                npm exec --workspace=@orbit/api prisma migrate deploy
              </DocsCode>
            }
            drizzle={
              <DocsCode>
                npm exec --workspace=@orbit/api drizzle-kit migrate
                --config=drizzle/drizzle.config.ts
              </DocsCode>
            }
          />
          .
        </li>
        <li>
          Health check path: <DocsCode>/health</DocsCode>.
        </li>
        <li>
          Disable auto-sleep (paid plan) — same rationale as Fly.
        </li>
      </DocsList>

      <DocsH2>Environment variables</DocsH2>
      <DocsP>
        The API's <DocsCode>.env.example</DocsCode> is the full list. For a
        smoke-test prod deploy, you need at minimum:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>DATABASE_URL</DocsCode> — prod Postgres.
        </li>
        <li>
          <DocsCode>BETTER_AUTH_SECRET</DocsCode> — long random string.
        </li>
        <li>
          <DocsCode>API_ORIGIN</DocsCode>, <DocsCode>WEB_ORIGIN</DocsCode>,{" "}
          <DocsCode>WWW_ORIGIN</DocsCode> — the actual public URLs.
        </li>
        <li>
          <DocsCode>RESEND_API_KEY</DocsCode> +{" "}
          <DocsCode>RESEND_FROM</DocsCode> — or your email provider's
          equivalent.
        </li>
      </DocsList>
      <DocsP>
        Everything else gates a feature: billing, OAuth, uploads, jobs. If
        the env var is missing, the feature degrades to a noop rather than
        throwing on boot — so a minimal deploy is possible, and adding a
        feature later is a secret-update away.
      </DocsP>

      <DocsH2>WebSockets, sticky sessions, and scaling</DocsH2>
      <DocsCallout kind="warn">
        The realtime hub is in-process. Two API instances do not share state:
        a broadcast on instance A never reaches a socket on instance B.
        Until the hub gets a Redis/NATS-backed implementation, run a single
        instance, or sticky-route WebSocket connections per workspace.
      </DocsCallout>
      <DocsP>
        Sticky routing per workspace is the pragmatic path — every workspace
        is a natural shard. Hash <DocsCode>workspaceSlug</DocsCode> → backend
        at your load balancer (Fly's <DocsCode>fly-replay</DocsCode>,
        Cloudflare's custom-hash LB, or a Hono middleware that re-emits the
        request on the correct node).
      </DocsP>

      <DocsH2>Health &amp; observability</DocsH2>
      <DocsList>
        <li>
          <DocsCode>GET /health</DocsCode> — liveness. Returns{" "}
          <DocsCode>200 {"{ ok: true }"}</DocsCode> once the container is up.
          Used by the docker-compose healthcheck and every deploy-platform's
          probe.
        </li>
        <li>
          Structured logs via <DocsCode>evlog</DocsCode> — one JSON-lines
          event per request, with <DocsCode>user</DocsCode>,{" "}
          <DocsCode>workspace</DocsCode>, and{" "}
          <DocsCode>route</DocsCode> attached. Ship to Datadog, Axiom,
          Logtail, wherever.
        </li>
      </DocsList>
    </DocsLayout>
  );
}
