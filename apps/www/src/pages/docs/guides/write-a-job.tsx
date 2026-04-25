import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsP,
} from "@/components/docs-layout";

export const meta = {
  title: "Write a graphile-worker job",
  description:
    "Declare a payload type, register a handler, pick a schedule. Works identically under QStash.",
};

export function WriteAJobPage() {
  return (
    <DocsLayout
      kicker="03 · Guides"
      title={meta.title}
      description={meta.description}
      path="/docs/guides/write-a-job"
    >
      <DocsP>
        Walking example: a <strong>workspace-invite cleanup</strong> job that
        runs hourly and deletes invites older than 14 days. The shape is
        provider-agnostic — the same <DocsCode>defineJob</DocsCode> call
        works under graphile-worker and QStash.
      </DocsP>

      <DocsH2>1. Augment the global jobs registry</DocsH2>
      <DocsP>
        Jobs are typed end-to-end: the payload you enqueue is the payload
        the handler receives. Declare it once by augmenting{" "}
        <DocsCode>OrbitJobs.Jobs</DocsCode>:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/workspaces/jobs/cleanup-stale-invites.job.ts">
        {`declare global {
  namespace OrbitJobs {
    interface Jobs {
      "workspaces.invites.cleanup-stale": { olderThanHours: number };
    }
  }
}`}
      </DocsCodeBlock>
      <DocsCallout>
        The job name is a string literal, not a constant. Pick something
        descriptive and namespaced —{" "}
        <DocsCode>{'"<context>.<aggregate>.<verb>"'}</DocsCode> works well.
        It's what shows up in logs and queue tables.
      </DocsCallout>

      <DocsH2>2. Define the handler</DocsH2>
      <DocsP>
        <DocsCode>defineJob</DocsCode> binds the name, handler, schedule, and
        retry policy. Dependencies (UoW, clock, application services) come
        in via the outer factory's closure — the handler context only
        carries what's specific to this run:{" "}
        <DocsCode>signal</DocsCode>, <DocsCode>attempt</DocsCode>, and{" "}
        <DocsCode>jobName</DocsCode>.
      </DocsP>
      <DocsCodeBlock>
        {`import { defineJob } from "@/jobs/application/job-registry.ts";
import type { WorkspacesServices } from "./feature.ts";

export function cleanupStaleInvitesJob(services: WorkspacesServices) {
  return defineJob({
    name: "workspaces.invites.cleanup-stale",
    schedule: "0 * * * *",          // every hour, on the hour
    maxAttempts: 3,
    handler: async (payload, ctx) => {
      if (ctx.signal.aborted) return;
      const deleted = await services.cleanupStaleInvites.execute({
        olderThanHours: payload.olderThanHours,
      });
      console.log(\`[\${ctx.jobName}] deleted \${deleted} invite(s)\`);
    },
  });
}`}
      </DocsCodeBlock>
      <DocsCallout>
        Real jobs in the repo follow this shape — see{" "}
        <DocsCode>apps/api/src/audit/jobs.ts</DocsCode> and{" "}
        <DocsCode>apps/api/src/demo/jobs.ts</DocsCode>. The handler stays
        thin and delegates to a service that already owns its UoW, clock,
        and repositories.
      </DocsCallout>
      <DocsP>
        The schedule is a 5-field crontab string (minute, hour, day, month,
        weekday). <DocsCode>0 * * * *</DocsCode> is hourly,{" "}
        <DocsCode>0 0 * * *</DocsCode> is daily at midnight UTC. Omit{" "}
        <DocsCode>schedule</DocsCode> entirely for on-demand jobs.
      </DocsP>

      <DocsH2>3. Register it in <DocsCode>buildJobs()</DocsCode></DocsH2>
      <DocsP>
        Jobs are collected centrally in{" "}
        <DocsCode>apps/api/src/jobs/feature.ts</DocsCode>. The{" "}
        <DocsCode>buildJobs(container)</DocsCode> function appends each job
        to the registry, closing over <DocsCode>container.services</DocsCode>{" "}
        so handlers reach the same application layer the HTTP routes use:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/jobs/feature.ts">
        {`import { cleanupStaleInvitesJob } from "@/workspaces/jobs/cleanup-stale-invites.job.ts";

export function buildJobs(container: AppContainer): JobRegistry {
  const jobs: JobDefinition[] = [];
  jobs.push(cleanupStaleInvitesJob(container.services));
  // other feature-gated jobs go here
  return jobs;
}`}
      </DocsCodeBlock>
      <DocsP>
        That's all the wiring. <DocsCode>composition.ts</DocsCode> already
        invokes <DocsCode>buildJobs()</DocsCode> after services are built and
        hands the aggregate registry to the chosen{" "}
        <DocsCode>JobRuntime</DocsCode> adapter.
      </DocsP>

      <DocsH2>4. Enqueueing on demand</DocsH2>
      <DocsP>
        Scheduled jobs run themselves. For ad-hoc or event-triggered
        dispatch, services call <DocsCode>queue.enqueue()</DocsCode> with
        the typed name and payload:
      </DocsP>
      <DocsCodeBlock>
        {`await queue.enqueue(
  "workspaces.invites.cleanup-stale",
  { olderThanHours: 24 * 14 },
  {
    jobKey: "invites-cleanup-daily",  // dedupe across parallel enqueues
    runAt: new Date(Date.now() + 10_000),
  },
);`}
      </DocsCodeBlock>
      <DocsP>
        <DocsCode>jobKey</DocsCode> is the provider-level dedupe handle.
        Same key, same-ish time? Only one runs. Use it for idempotency on
        projectors that may fire the same event more than once.
      </DocsP>

      <DocsH3>Enqueueing from a projector</DocsH3>
      <DocsP>
        A common pattern: domain event fires, projector queues a job that
        does the heavy lifting after commit. Keeps the event-bus handler
        fast and makes the real work retriable:
      </DocsP>
      <DocsCodeBlock>
        {`bus.subscribe<WorkspaceMemberJoined>(
  "workspaces.member.joined",
  async (event) => {
    await queue.enqueue(
      "workspaces.onboarding.send-welcome",
      { memberId: event.memberId },
      { jobKey: \`welcome:\${event.memberId}\` },
    );
  },
);`}
      </DocsCodeBlock>

      <DocsH2>5. How it actually runs</DocsH2>

      <DocsH3>Under graphile-worker</DocsH3>
      <DocsP>
        The API process boots <DocsCode>GraphileJobRuntime</DocsCode> as
        part of startup. It polls the <DocsCode>graphile_worker.jobs</DocsCode>{" "}
        table and uses Postgres <DocsCode>LISTEN/NOTIFY</DocsCode> for
        low-latency dispatch. Scheduled jobs are inserted by graphile's
        cron mechanism on boot and re-scheduled after each run.
      </DocsP>
      <DocsCallout kind="warn">
        Workers need long-lived Postgres sessions. If{" "}
        <DocsCode>DATABASE_URL</DocsCode> points at a transaction pooler,
        set <DocsCode>WORKER_DATABASE_URL</DocsCode> to a direct URL — see
        the Postgres deploy page.
      </DocsCallout>

      <DocsH3>Under QStash</DocsH3>
      <DocsP>
        Enqueue publishes to QStash. On the schedule or{" "}
        <DocsCode>runAt</DocsCode>, QStash POSTs to{" "}
        <DocsCode>{"${QSTASH_CALLBACK_URL}/v1/jobs/run/workspaces.invites.cleanup-stale"}</DocsCode>.{" "}
        The API verifies the signature against{" "}
        <DocsCode>QSTASH_CURRENT_SIGNING_KEY</DocsCode> and{" "}
        <DocsCode>QSTASH_NEXT_SIGNING_KEY</DocsCode>, parses the payload,
        and dispatches to the same handler.
      </DocsP>
      <DocsP>
        You don't change anything in the job code — same{" "}
        <DocsCode>defineJob</DocsCode> definition, different transport.
      </DocsP>

      <DocsH2>Idempotency</DocsH2>
      <DocsP>
        Jobs can run more than once. Providers retry on thrown errors;{" "}
        <DocsCode>upstash-retried</DocsCode> counts increment on each
        attempt. Write handlers that tolerate it:
      </DocsP>
      <DocsCodeBlock>
        {`handler: async (payload, ctx) => {
  if (ctx.attempt > 1) {
    console.warn(\`[\${ctx.jobName}] retry attempt=\${ctx.attempt}\`);
  }
  await services.cleanupStaleInvites.execute(payload);
  // Use natural keys + UPSERT inside the service. Don't check-then-write.
  // Don't assume the previous attempt did nothing.
}`}
      </DocsCodeBlock>

      <DocsH2>Testing</DocsH2>
      <DocsP>
        Job handlers are just async functions over the service closure. Test
        them by building the same services you'd hand to a controller —
        in-memory UoW, fake clock, recording event bus — and invoking the
        handler with a stub context:
      </DocsP>
      <DocsCodeBlock>
        {`it("deletes invites older than the cutoff", async () => {
  const clock = new FixedClock("2026-05-01T00:00:00Z");
  const uow = new InMemoryUnitOfWork();
  await uow.run(tx => tx.workspaceInvites.saveAll([
    pendingInvite({ createdAt: "2026-04-01T00:00:00Z" }),  // stale
    pendingInvite({ createdAt: "2026-04-29T00:00:00Z" }),  // fresh
  ]));

  const services: WorkspacesServices = {
    cleanupStaleInvites: new CleanupStaleInvitesService(uow, clock),
    // ... other services
  };
  const job = cleanupStaleInvitesJob(services);
  await job.handler(
    { olderThanHours: 24 * 14 },
    { signal: new AbortController().signal, attempt: 1, jobName: job.name },
  );

  const remaining = await uow.read(tx => tx.workspaceInvites.listAll());
  expect(remaining).toHaveLength(1);
});`}
      </DocsCodeBlock>
      <DocsP>
        No queue, no worker, no Postgres. The handler is pure logic; the
        runtime is the thing you're not testing.
      </DocsP>
    </DocsLayout>
  );
}
