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
  title: "Jobs providers",
  description:
    "A provider-agnostic queue, a pluggable runtime, and a registry that's typed end-to-end.",
};

export function JobsIntegrationsPage() {
  return (
    <DocsLayout
      kicker="05 · Integrations"
      title={meta.title}
      description={meta.description}
      path="/docs/integrations/jobs"
    >
      <DocsP>
        Background jobs are the one place in the stack where "do this work
        eventually" needs real durability — retries, idempotency, scheduling.
        Orbit ships two implementations of the same port so you can pick
        based on where you deploy: a Postgres-backed worker for long-lived
        VMs, and an HTTP queue for serverless.
      </DocsP>

      <DocsH2>The ports</DocsH2>
      <DocsCodeBlock caption="apps/api/src/jobs/application/">
        {`// job-queue.ts — what services call to enqueue
export interface JobQueue {
  enqueue<N extends JobName>(
    name: N,
    payload: JobPayload<N>,
    options?: { runAt?: Date; jobKey?: string; maxAttempts?: number },
  ): Promise<void>;
}

// job-runtime.ts — what the API boots to execute
export interface JobRuntime {
  readonly provider: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}`}
      </DocsCodeBlock>
      <DocsP>
        Two ports, because the caller's concern ("enqueue this") is
        different from the process's concern ("drain the queue"). A
        serverless deployment might not run a worker at all — you'd still
        enqueue via <DocsCode>JobQueue</DocsCode>, and delivery would happen
        over HTTP to <DocsCode>/v1/jobs/run/:name</DocsCode>.
      </DocsP>

      <DocsH2>The three adapters</DocsH2>
      <DocsTable
        columns={["Provider", "Enqueue", "Execute", "Best for"]}
        rows={[
          [
            <DocsCode>graphile</DocsCode>,
            "INSERT into Postgres",
            "Long-lived worker polls + LISTEN/NOTIFY",
            "Single-VM or containerised deploys; zero new infra.",
          ],
          [
            <DocsCode>qstash</DocsCode>,
            "Upstash QStash publish API",
            "POST /v1/jobs/run/:name with signature",
            "Serverless (Vercel, Cloudflare Workers, Fly machines).",
          ],
          [
            <DocsCode>noop</DocsCode>,
            "409 errors from the port",
            "Nothing",
            "Running without background work (dev, tests, initial boot).",
          ],
        ]}
      />

      <DocsH3>graphile-worker</DocsH3>
      <DocsP>
        Stores jobs in your primary Postgres. The runtime opens a dedicated
        pool (<DocsCode>WORKER_DATABASE_URL</DocsCode> if set — otherwise
        falls back to <DocsCode>DATABASE_URL</DocsCode>) and polls plus uses
        LISTEN/NOTIFY for low-latency dispatch.{" "}
        <DocsCode>JOBS_CONCURRENCY</DocsCode> sets parallelism per instance
        (default <DocsCode>2</DocsCode>).
      </DocsP>
      <DocsCallout kind="warn">
        graphile-worker needs long-lived sessions. If{" "}
        <DocsCode>DATABASE_URL</DocsCode> points at a transaction pooler
        (PgBouncer, PlanetScale psdb), set{" "}
        <DocsCode>WORKER_DATABASE_URL</DocsCode> to a direct/session URL — the
        pooler drops LISTEN subscriptions.
      </DocsCallout>

      <DocsH3>Upstash QStash</DocsH3>
      <DocsP>
        Jobs are HTTP POSTs. On enqueue, the adapter publishes to QStash;
        QStash delivers to <DocsCode>{"${QSTASH_CALLBACK_URL}/v1/jobs/run/<name>"}</DocsCode>{" "}
        on the schedule you requested. The API verifies the signature and
        routes to the matching handler in the registry.
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>QSTASH_TOKEN</DocsCode> — publish-side key.
        </li>
        <li>
          <DocsCode>QSTASH_CURRENT_SIGNING_KEY</DocsCode> +{" "}
          <DocsCode>QSTASH_NEXT_SIGNING_KEY</DocsCode> — rotating
          verification keys; both checked on inbound delivery.
        </li>
        <li>
          <DocsCode>QSTASH_CALLBACK_URL</DocsCode> — must be public-internet
          reachable. In dev, smee.io / ngrok / a Cloudflare Tunnel.
        </li>
      </DocsList>

      <DocsH3>Noop</DocsH3>
      <DocsP>
        Unset <DocsCode>JOBS_PROVIDER</DocsCode> (or set it to{" "}
        <DocsCode>noop</DocsCode>) and every <DocsCode>queue.enqueue()</DocsCode>{" "}
        throws a <DocsCode>409 jobs.not_configured</DocsCode>. Services that
        enqueue non-critical work should catch and degrade gracefully;
        critical-path code shouldn't enqueue at all.
      </DocsP>

      <DocsH2>Defining a job</DocsH2>
      <DocsP>Jobs are strongly typed via module augmentation:</DocsP>
      <DocsCodeBlock>
        {`// apps/api/src/some-feature/jobs/cleanup.job.ts
declare global {
  namespace OrbitJobs {
    interface Jobs {
      "cleanup.stale-invites": { olderThanHours: number };
    }
  }
}

export const cleanupStaleInvitesJob = defineJob({
  name: "cleanup.stale-invites",
  schedule: "0 * * * *",              // every hour
  maxAttempts: 3,
  handler: async (payload, ctx) => {
    await ctx.uow.run(async (tx) => {
      const cutoff = subHours(ctx.clock.now(), payload.olderThanHours);
      await tx.workspaceInvites.deleteExpiredBefore(cutoff);
    });
  },
});`}
      </DocsCodeBlock>
      <DocsP>
        Augmenting <DocsCode>OrbitJobs.Jobs</DocsCode> makes{" "}
        <DocsCode>queue.enqueue("cleanup.stale-invites", {"{...}"})</DocsCode>{" "}
        type-check against the payload shape at the call site. Misnamed jobs
        and mis-shaped payloads fail at compile time, not at 03:00.
      </DocsP>

      <DocsH2>Registering jobs</DocsH2>
      <DocsP>
        Each feature exports a list of job definitions; the composition root
        assembles them into a <DocsCode>JobRegistry</DocsCode> and hands the
        registry to the runtime:
      </DocsP>
      <DocsCodeBlock>
        {`// Inside a feature's feature.ts
export function jobs(core): readonly JobDefinition[] {
  return [cleanupStaleInvitesJob(core), /* ... */];
}

// composition.ts
const registry = buildJobs([
  ...workspacesFeature.jobs?.(core) ?? [],
  ...billingFeature.jobs?.(core) ?? [],
]);
const runtime = buildJobRuntime(jobsConfig, registry);
await runtime.start();`}
      </DocsCodeBlock>

      <DocsH2>The webhook endpoint</DocsH2>
      <DocsP>
        When <DocsCode>JOBS_PROVIDER=qstash</DocsCode>, Orbit mounts a single
        route the queue calls into:
      </DocsP>
      <DocsCodeBlock>POST /v1/jobs/run/:name</DocsCodeBlock>
      <DocsList ordered>
        <li>
          <strong>Read raw body &amp; headers.</strong> Signature verification
          needs exact bytes; headers are lowercased before dispatch.
        </li>
        <li>
          <strong>Verify.</strong>{" "}
          <DocsCode>QStashJobDispatcher</DocsCode> calls Upstash's{" "}
          <DocsCode>Receiver.verify()</DocsCode> with the current key, then
          the next key. Failure throws{" "}
          <DocsCode>InvalidJobSignatureError</DocsCode> → 401.
        </li>
        <li>
          <strong>Parse &amp; route.</strong> Payload is JSON-parsed, then
          dispatched to <DocsCode>registry.find(d =&gt; d.name === name)</DocsCode>.
        </li>
        <li>
          <strong>Count attempts.</strong> QStash sends{" "}
          <DocsCode>upstash-retried</DocsCode>; the dispatcher adds 1 and
          passes <DocsCode>attempt</DocsCode> to the handler so
          idempotent work knows whether it's a retry.
        </li>
      </DocsList>

      <DocsH2>Idempotency</DocsH2>
      <DocsP>
        Jobs can fire more than once — graphile retries on thrown errors,
        QStash on HTTP failure. Guard rails:
      </DocsP>
      <DocsList>
        <li>
          <strong><DocsCode>jobKey</DocsCode> on enqueue.</strong> Providers
          dedupe same-key enqueues when you pass one, so "send reminder for
          invite X" doesn't stack up.
        </li>
        <li>
          <strong>Natural keys in your write.</strong> Prefer{" "}
          <DocsCode>UPSERT</DocsCode> + unique indexes over checking-then-writing
          — the retry will land on the same row either way.
        </li>
        <li>
          <strong>The domain event ledger.</strong> For projector work that
          must-not-run-twice, use the same dedupe pattern as billing
          webhooks: a{" "}
          <DocsCode>processed</DocsCode> row keyed by the event id.
        </li>
      </DocsList>
    </DocsLayout>
  );
}
