import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export function ChangelogPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader active="/changelog" />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-10 md:px-12 md:pt-16 md:pb-14">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          Changelog
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          What's new.{" "}
          <span className="text-muted-foreground">What's next.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Every release that moves the CLI forward. Entries are dated in the
          order they ship — pinned to the version your scaffold was generated
          from.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 md:px-12">
        <ol className="relative space-y-12 border-border/50 border-l pl-8">
          {ENTRIES.map((entry) => (
            <li key={entry.version} className="relative">
              <span className="-left-[9px] absolute top-1.5 inline-block h-2 w-2 rounded-full border border-border bg-background" />

              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-medium text-foreground text-sm">
                  {entry.version}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums tracking-[0.15em]">
                  {entry.date}
                </span>
                {entry.label && (
                  <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                    {entry.label}
                  </span>
                )}
              </div>

              <h2 className="mt-2 font-medium text-foreground text-lg">
                {entry.title}
              </h2>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {entry.summary}
              </p>

              <ul className="mt-4 space-y-2 text-sm">
                {entry.highlights.map((h) => (
                  <li
                    key={h}
                    className="grid grid-cols-[1rem_1fr] items-baseline gap-3"
                  >
                    <span className="text-muted-foreground">›</span>
                    <span className="text-foreground/90 leading-relaxed">
                      {h}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-xl border border-dashed border-border/60 p-6 text-center">
          <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
            On the roadmap
          </div>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
            Remix / React Router v7 shell · audit log context · SSO (SAML) ·
            rate-limiting middleware · OpenAPI-generated TypeScript client.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const ENTRIES = [
  {
    version: "0.9.0",
    date: "2026-04-23",
    label: "Latest",
    title: "Waitlists & private beta gating",
    summary:
      "Optional waitlist context lets you ship a request-access flow before flipping a product fully public. Accept flow, admin approval, and email templates all wired.",
    highlights: [
      "New `waitlist` bounded context — WaitlistEntry, request/accept/approve use cases.",
      "/request-access page on the web shell, rate-limited.",
      "Admin console can approve or reject entries in bulk.",
      "better-auth hook gates signup on an accepted waitlist invite.",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-04-18",
    title: "App-level admin via the better-auth admin plugin",
    summary:
      "First-class admin dashboard for the people running the SaaS — impersonate users, list accounts, revoke sessions. Separate from workspace-level roles.",
    highlights: [
      "Admin plugin enabled on the better-auth instance.",
      "/admin route group on both web shells, gated by the admin role.",
      "Impersonation surface with a visible session banner.",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-04-12",
    title: "Dual-shell polish",
    summary:
      "Sidebar context, CORS, font loading, and dialog polish unified between the TanStack and Next shells. No divergence between the two scaffolds.",
    highlights: [
      "Shared workspace-settings shell consumed by both apps/web-tanstack and apps/web-next.",
      "Dual-origin CORS for API requests from either shell in dev.",
      "Variable fonts (Geist + Inter) self-hosted with preload hints.",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-04-05",
    title: "Next.js 15 shell lands",
    summary:
      "Second frontend shell under apps/web-next — same UI, same API, different framework. Pick one at scaffold time; the CLI strips the other.",
    highlights: [
      "App Router + Turbopack. Server components where they make sense.",
      "All workspace-settings views ported.",
      "features.json gains a `frontend` feature with framework option.",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-03-28",
    title: "Jobs port + Upstash QStash adapter",
    summary:
      "Background work is now a port. graphile-worker stays the default; Upstash QStash adapter added for serverless deployments.",
    highlights: [
      "JobQueue + JobRuntime interfaces under src/jobs/application.",
      "QStash dispatcher maps signed HTTP posts to handlers.",
      "Noop adapter for tests and inline execution.",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-03-20",
    title: "Billing: Polar + Dodo Payments adapters",
    summary:
      "BillingProvider port gains two merchant-of-record adapters alongside Stripe. Pick one at scaffold time; webhooks, checkout, and portal all covered per provider.",
    highlights: [
      "stripe-billing-provider, polar-billing-provider, dodo-billing-provider.",
      "Per-provider webhook receivers with signature verification.",
      "BillingEvent append-only ledger for idempotency.",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-03-12",
    title: "Feature fencing + declarative manifest",
    summary:
      "Inline // +feature: / // -feature: markers in source; features.json declares what's optional. The CLI strips disabled features cleanly — no dead code, no runtime flags.",
    highlights: [
      "16 features declared (teams, billing, billing-*, uploads, waitlist, realtime, jobs, jobs-*, frontend, frontend-*, auth-*, email-resend).",
      "Strip engine walks the repo and removes fenced regions.",
      "features.schema.json for editor autocomplete.",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-03-05",
    title: "BoilerKit migration: teams + billing land",
    summary:
      "All chat / messaging / rooms code ripped. Teams and billing bounded contexts added as first-class features on the same DDD shape.",
    highlights: [
      "apps/api/src/teams — domain, application, infrastructure.",
      "apps/api/src/billing — port + Stripe adapter + webhook handler.",
      "Per-team PBAC with TEAM_ADMIN / TEAM_MEMBER + custom roles.",
      "Workspace-settings Teams & Billing pages wired end-to-end.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-02-20",
    title: "Initial public preview",
    summary:
      "First private-beta release of the CLI. Core monorepo, DDD-layered API, TanStack Start shell, workspaces, PBAC, and a realtime hub.",
    highlights: [
      "Turbo monorepo — apps/api, apps/web-tanstack, apps/www, packages/shared, packages/ui.",
      "Prisma schema + branded UUIDv7 IDs.",
      "Unit of Work + in-process event bus.",
      "WebSocket hub with presence tracker.",
    ],
  },
];
