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
  title: "Environment variables",
  description:
    "Everything in apps/api/.env.example, grouped by what it turns on. The web shells need only two.",
};

export function EnvironmentVariablesPage() {
  return (
    <DocsLayout
      kicker="01 · Getting started"
      title={meta.title}
      description={meta.description}
      path="/docs/getting-started/environment-variables"
    >
      <DocsP>
        The API's env file is the source of truth for almost every adapter
        choice. Start by copying the example:
      </DocsP>
      <DocsCodeBlock lang="bash">
        cp apps/api/.env.example apps/api/.env
      </DocsCodeBlock>
      <DocsP>
        Then fill in what you need. Only two variables are <em>strictly</em>{" "}
        required to boot the API:
      </DocsP>
      <DocsTable
        columns={["Var", "Required", "Default"]}
        rows={[
          [<DocsCode>DATABASE_URL</DocsCode>, "yes", "—"],
          [<DocsCode>BETTER_AUTH_SECRET</DocsCode>, "yes", <DocsCode>change-me-in-prod</DocsCode>],
        ]}
      />
      <DocsCallout kind="warn">
        <DocsCode>BETTER_AUTH_SECRET</DocsCode> signs every session token. In
        prod, generate a long random string —{" "}
        <DocsCode>openssl rand -hex 32</DocsCode> is fine. If you leak or rotate
        it, every existing session logs out.
      </DocsCallout>

      <DocsH2>Database</DocsH2>
      <DocsTable
        columns={["Var", "What it does"]}
        rows={[
          [
            <DocsCode>DATABASE_URL</DocsCode>,
            "Postgres connection string. Used at runtime by the API and by migrations (Prisma or drizzle-kit).",
          ],
          [
            <DocsCode>DIRECT_DATABASE_URL</DocsCode>,
            <>
              Optional non-pooled URL. Set this if{" "}
              <DocsCode>DATABASE_URL</DocsCode> points at a transaction
              pooler (PgBouncer, PlanetScale psdb) — migration tools need
              direct connections for advisory locks.
            </>,
          ],
        ]}
      />

      <DocsH2>Auth &amp; origins</DocsH2>
      <DocsTable
        columns={["Var", "Default", "What it does"]}
        rows={[
          [
            <DocsCode>BETTER_AUTH_SECRET</DocsCode>,
            <DocsCode>change-me-in-prod</DocsCode>,
            "Session signing key. Required in every environment.",
          ],
          [
            <DocsCode>MAGIC_LINK_TTL_MIN</DocsCode>,
            "15",
            "How long a magic link stays valid after it's minted.",
          ],
          [
            <DocsCode>API_ORIGIN</DocsCode>,
            "http://localhost:4002",
            "Where the API answers. Used in mail templates and OAuth redirects.",
          ],
          [
            <DocsCode>WEB_ORIGIN</DocsCode>,
            "http://localhost:4001",
            "Primary authenticated-app origin (allowed by CORS, trusted by better-auth).",
          ],
          [
            <DocsCode>WWW_ORIGIN</DocsCode>,
            "http://localhost:4000",
            "Marketing site origin.",
          ],
          [
            <DocsCode>ADDITIONAL_WEB_ORIGINS</DocsCode>,
            <DocsCode>http://localhost:4003</DocsCode>,
            "Comma-separated list of extra allowed web origins. Handy when running both web-tanstack and web-next against the same API.",
          ],
          [
            <DocsCode>PORT</DocsCode>,
            "4002",
            "Port the API listens on. Change this if you change API_ORIGIN.",
          ],
        ]}
      />

      <DocsH2>OAuth providers (optional)</DocsH2>
      <DocsP>
        better-auth only registers providers whose client id <em>and</em>{" "}
        secret are both set. Leave them unset to disable:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>GOOGLE_CLIENT_ID</DocsCode> +{" "}
          <DocsCode>GOOGLE_CLIENT_SECRET</DocsCode>
        </li>
        <li>
          <DocsCode>APPLE_CLIENT_ID</DocsCode> +{" "}
          <DocsCode>APPLE_CLIENT_SECRET</DocsCode>
        </li>
      </DocsList>
      <DocsP>
        Redirect URIs to register with each provider:{" "}
        <DocsCode>{"${API_ORIGIN}/v1/auth/callback/google"}</DocsCode> and{" "}
        <DocsCode>{"${API_ORIGIN}/v1/auth/callback/apple"}</DocsCode>.
      </DocsP>

      <DocsH2>Email</DocsH2>
      <DocsTable
        columns={["Var", "What it does"]}
        rows={[
          [
            <DocsCode>RESEND_API_KEY</DocsCode>,
            "Unset = ConsoleMailer (logs links to stdout + exposes them at GET /v1/dev/last-magic-link). Set = Resend in prod.",
          ],
          [
            <DocsCode>RESEND_FROM</DocsCode>,
            <>
              Sender name + address. Format:{" "}
              <DocsCode>Orbit &lt;hello@yourdomain.com&gt;</DocsCode>
            </>,
          ],
          [
            <DocsCode>RESEND_SEND_IN_DEV</DocsCode>,
            "Set to 1 to force Resend even in dev — useful for template QA.",
          ],
        ]}
      />

      <DocsH2>Billing</DocsH2>
      <DocsP>
        <DocsCode>BILLING_PROVIDER</DocsCode> is the master switch. When unset
        or set to <DocsCode>noop</DocsCode>, the billing routes return a
        disabled-state response and no provider SDK is constructed. Set it to
        one of <DocsCode>stripe</DocsCode> / <DocsCode>polar</DocsCode> /{" "}
        <DocsCode>dodo</DocsCode> to wire the matching adapter.
      </DocsP>

      <DocsH3>Plan catalog</DocsH3>
      <DocsP>
        <DocsCode>BILLING_PLANS_JSON</DocsCode> is a JSON array of plan
        descriptors rendered on the billing settings page. Keep it small — once
        you outgrow a handful of plans, replace the env-backed source in{" "}
        <DocsCode>composition.ts</DocsCode> with a DB-backed provider.
      </DocsP>
      <DocsCodeBlock lang="bash">
        {`BILLING_PLANS_JSON='[
  {
    "key": "pro",
    "name": "Pro",
    "priceId": "price_...",
    "unitAmount": 800,
    "currency": "usd",
    "interval": "month",
    "intervalCount": 1,
    "features": ["Unlimited teams", "Priority email"]
  }
]'`}
      </DocsCodeBlock>

      <DocsH3>Per-provider secrets</DocsH3>
      <DocsTable
        columns={["Provider", "Vars"]}
        rows={[
          [
            "Stripe",
            <>
              <DocsCode>STRIPE_SECRET_KEY</DocsCode>,{" "}
              <DocsCode>STRIPE_WEBHOOK_SECRET</DocsCode>
            </>,
          ],
          [
            "Polar",
            <>
              <DocsCode>POLAR_ACCESS_TOKEN</DocsCode>,{" "}
              <DocsCode>POLAR_WEBHOOK_SECRET</DocsCode>,{" "}
              <DocsCode>POLAR_SERVER</DocsCode> (
              <DocsCode>sandbox</DocsCode> | <DocsCode>production</DocsCode>)
            </>,
          ],
          [
            "Dodo",
            <>
              <DocsCode>DODO_PAYMENTS_API_KEY</DocsCode>,{" "}
              <DocsCode>DODO_PAYMENTS_WEBHOOK_KEY</DocsCode>,{" "}
              <DocsCode>DODO_PAYMENTS_ENVIRONMENT</DocsCode> (
              <DocsCode>test_mode</DocsCode> | <DocsCode>live_mode</DocsCode>)
            </>,
          ],
        ]}
      />

      <DocsH2>Background jobs</DocsH2>
      <DocsP>
        <DocsCode>JOBS_PROVIDER</DocsCode> picks the adapter for the{" "}
        <DocsCode>JobQueue</DocsCode> and <DocsCode>JobRuntime</DocsCode> ports.
        Leave unset or set to <DocsCode>noop</DocsCode> to boot without
        background work; services that would enqueue a job 409 instead.
      </DocsP>
      <DocsTable
        columns={["Var", "Scope", "What it does"]}
        rows={[
          [
            <DocsCode>JOBS_PROVIDER</DocsCode>,
            "both",
            <>
              <DocsCode>graphile</DocsCode> (Postgres-backed, self-hosted) /{" "}
              <DocsCode>qstash</DocsCode> (Upstash managed HTTP) /{" "}
              <DocsCode>noop</DocsCode>.
            </>,
          ],
          [
            <DocsCode>WORKER_DATABASE_URL</DocsCode>,
            "graphile",
            <>
              Optional direct/session URL for LISTEN/NOTIFY. Fallback is{" "}
              <DocsCode>DATABASE_URL</DocsCode>.
            </>,
          ],
          [
            <DocsCode>JOBS_CONCURRENCY</DocsCode>,
            "graphile",
            "Parallelism for this worker instance. Default 2.",
          ],
          [
            <DocsCode>QSTASH_TOKEN</DocsCode>,
            "qstash",
            "Publish-side API token from the Upstash console.",
          ],
          [
            <DocsCode>QSTASH_CURRENT_SIGNING_KEY</DocsCode>,
            "qstash",
            "Current webhook-verification key (rotated by QStash).",
          ],
          [
            <DocsCode>QSTASH_NEXT_SIGNING_KEY</DocsCode>,
            "qstash",
            "Next webhook-verification key; both are checked on delivery.",
          ],
          [
            <DocsCode>QSTASH_CALLBACK_URL</DocsCode>,
            "qstash",
            "Public base URL of this API. Must be internet-reachable in dev (smee, ngrok, tunnel).",
          ],
        ]}
      />

      <DocsH2>Rate limiting</DocsH2>
      <DocsP>
        <DocsCode>RATE_LIMIT_PROVIDER</DocsCode> picks the adapter for the{" "}
        <DocsCode>RateLimiter</DocsCode> port. Leave unset or set to{" "}
        <DocsCode>memory</DocsCode> for the in-process sliding-window bucket;
        set to <DocsCode>upstash</DocsCode> for a Redis-backed limiter shared
        across workers and serverless instances.
      </DocsP>
      <DocsTable
        columns={["Var", "Scope", "What it does"]}
        rows={[
          [
            <DocsCode>RATE_LIMIT_PROVIDER</DocsCode>,
            "all",
            <>
              <DocsCode>noop</DocsCode> / <DocsCode>memory</DocsCode> (default)
              {" "}/ <DocsCode>upstash</DocsCode> / <DocsCode>unkey</DocsCode>.
            </>,
          ],
          [
            <DocsCode>UPSTASH_REDIS_REST_URL</DocsCode>,
            "upstash",
            "REST URL for the Upstash Redis database.",
          ],
          [
            <DocsCode>UPSTASH_REDIS_REST_TOKEN</DocsCode>,
            "upstash",
            "REST token with read/write access.",
          ],
          [
            <DocsCode>UNKEY_ROOT_KEY</DocsCode>,
            "unkey",
            "Root API key from the Unkey dashboard.",
          ],
          [
            <DocsCode>UNKEY_RATELIMIT_NAMESPACE</DocsCode>,
            "unkey",
            <>Namespace prefix. Defaults to <DocsCode>orbit</DocsCode>.</>,
          ],
        ]}
      />
      <DocsCallout kind="warn">
        The <DocsCode>memory</DocsCode> adapter is single-process only — state
        is not shared across workers, is lost on restart, and does NOT protect
        a horizontally scaled or serverless deploy. The API warns at boot if
        it's used in production. See{" "}
        <DocsCode>/docs/integrations/rate-limiting</DocsCode> for the full
        rundown.
      </DocsCallout>

      <DocsH2>Uploads (optional)</DocsH2>
      <DocsP>
        <DocsCode>UPLOADTHING_TOKEN</DocsCode> enables the signed-upload
        endpoints. Leave unset to disable uploads entirely — the UI hides the
        avatar upload affordance when it sees the disabled state.
      </DocsP>

      <DocsH2>Waitlist mode (optional)</DocsH2>
      <DocsList>
        <li>
          <DocsCode>IS_WAITLIST_ENABLED</DocsCode> —{" "}
          <DocsCode>true</DocsCode> replaces the final step of{" "}
          <DocsCode>/onboarding</DocsCode> with a "you're on the list" screen
          instead of creating a workspace.
          <DocsCode>POST /v1/waitlist</DocsCode> accepts submissions regardless.
        </li>
        <li>
          <DocsCode>WAITLIST_ADMIN_SECRET</DocsCode> — If set,{" "}
          <DocsCode>POST /v1/waitlist/accept</DocsCode> with{" "}
          <DocsCode>Authorization: Bearer &lt;secret&gt;</DocsCode> marks an
          entry approved.
        </li>
      </DocsList>

      <DocsH2>Webhook tunneling (dev)</DocsH2>
      <DocsTable
        columns={["Var", "What it does"]}
        rows={[
          [
            <DocsCode>SMEE_URL</DocsCode>,
            "Your personal smee.io URL. Register it as your provider's webhook endpoint; the apps/webhook-tunnel workspace reads this and forwards POSTs to the local API.",
          ],
          [
            <DocsCode>SMEE_TARGET_PATH</DocsCode>,
            <>
              Route to forward to. Defaults to{" "}
              <DocsCode>/v1/billing/webhooks/stripe</DocsCode> — switch to{" "}
              <DocsCode>/polar</DocsCode> or <DocsCode>/dodo</DocsCode> for the
              other adapters.
            </>,
          ],
        ]}
      />

      <DocsH2>Seed overrides (optional)</DocsH2>
      <DocsP>
        The seed script reads a handful of env vars so you can point it at
        your own email and workspace slug in dev:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>SEED_OWNER_EMAIL</DocsCode> — default{" "}
          <DocsCode>owner@wereorbit.com</DocsCode>
        </li>
        <li>
          <DocsCode>SEED_OWNER_NAME</DocsCode> — default{" "}
          <DocsCode>Demo Owner</DocsCode>
        </li>
        <li>
          <DocsCode>SEED_WORKSPACE_SLUG</DocsCode> — default{" "}
          <DocsCode>demo</DocsCode>
        </li>
        <li>
          <DocsCode>SEED_WORKSPACE_NAME</DocsCode> — default{" "}
          <DocsCode>Demo</DocsCode>
        </li>
      </DocsList>

      <DocsH2>The web shells</DocsH2>
      <DocsP>
        The TanStack and Next shells need only two build-time vars, baked into
        the bundle by Vite / Next at <DocsCode>build</DocsCode> time:
      </DocsP>
      <DocsTable
        columns={["Var", "What it does"]}
        rows={[
          [
            <DocsCode>VITE_API_URL</DocsCode>,
            "Base URL the client hits for REST and WebSocket traffic.",
          ],
          [
            <DocsCode>VITE_WEB_URL</DocsCode>,
            "Canonical origin for the authenticated app — used in email links and share URLs.",
          ],
        ]}
      />
      <DocsP>
        The marketing site (<DocsCode>apps/www</DocsCode>) needs only{" "}
        <DocsCode>VITE_WEB_URL</DocsCode>, for the sign-in and "get access"
        buttons.
      </DocsP>
    </DocsLayout>
  );
}
