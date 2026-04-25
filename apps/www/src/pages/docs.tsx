import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { Button } from "@orbit/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { CopyCommand } from "@/components/copy-command";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { CHECKOUT_URLS } from "@/lib/checkout";

export function DocsPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader active="/docs" />

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-10 pb-12 md:px-12 md:pt-16 md:pb-16">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          Docs
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          Start here.{" "}
          <span className="text-muted-foreground">Ship today.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Everything you need to run the CLI, understand the architecture, and
          extend Orbit with your own domain. Docs are maintained alongside the
          code — version-pinned to the release your CLI scaffolded.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <CopyCommand command="npx create-orb@latest" />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 md:px-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <article
              key={section.title}
              className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/30 p-6 not-dark:bg-clip-padding md:p-8"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
                  {section.kicker}
                </div>
                {section.status && (
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                    {section.status}
                  </div>
                )}
              </div>
              <div className="font-medium text-foreground text-lg">
                {section.title}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {section.description}
              </p>
              <ul className="mt-2 divide-y divide-border/60 border-border/60 border-t text-sm">
                {section.entries.map((entry) =>
                  entry.to ? (
                    <li key={entry.label}>
                      <Link
                        to={entry.to}
                        className="-mx-2 grid grid-cols-[1fr_auto] items-center gap-3 rounded px-2 py-3 text-foreground/90 transition-colors hover:bg-accent/20 hover:text-foreground"
                      >
                        <div>{entry.label}</div>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                          {entry.tag}
                          {entry.external && (
                            <ExternalLink
                              className="h-3 w-3"
                              strokeWidth={1.5}
                            />
                          )}
                        </span>
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={entry.label}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 py-3"
                    >
                      <div className="text-foreground/50">{entry.label}</div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em]">
                        Soon
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 md:px-12">
        <div className="rounded-xl border border-border/60 bg-card/30 p-8 not-dark:bg-clip-padding">
          <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
            Not ready yet?
          </div>
          <h2 className="mt-3 font-medium text-xl text-foreground">
            Jump straight to the repo.
          </h2>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            The README covers a 90-second tour, env vars, and the Postgres
            bootstrap. Everything else you'll learn by following the code —
            each bounded context has the same shape.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="default"
              size="lg"
              render={
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
                  <ArrowRight />
                </a>
              }
            />
            <Button
              variant="outline"
              size="lg"
              render={<a href={CHECKOUT_URLS.builder}>Get access</a>}
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

type DocsEntry = {
  label: string;
  tag: string;
  to?: string;
  external?: boolean;
};

const SECTIONS: {
  kicker: string;
  title: string;
  description: string;
  status?: string;
  entries: DocsEntry[];
}[] = [
  {
    kicker: "01 · Getting started",
    title: "Run the CLI, boot the app",
    description:
      "Install prerequisites, scaffold a new project, configure .env, and get the dev server running in under five minutes.",
    entries: [
      {
        label: "Prerequisites (Node, Postgres, npm)",
        tag: "Read",
        to: "/docs/getting-started/prerequisites",
      },
      {
        label: "Running the CLI",
        tag: "Read",
        to: "/docs/getting-started/running-the-cli",
      },
      {
        label: "Configuring environment variables",
        tag: "Read",
        to: "/docs/getting-started/environment-variables",
      },
      {
        label: "First migration + seed",
        tag: "Read",
        to: "/docs/getting-started/first-migration-and-seed",
      },
      {
        label: "npm run dev — what's happening?",
        tag: "Read",
        to: "/docs/getting-started/dev-server",
      },
    ],
  },
  {
    kicker: "02 · Concepts",
    title: "How Orbit is structured",
    description:
      "The ideas that shape every bounded context: workspaces, teams, PBAC, the Unit of Work, the event bus, and the realtime hub.",
    entries: [
      {
        label: "Workspaces, teams, and tenancy",
        tag: "Read",
        to: "/docs/concepts/workspaces-teams-tenancy",
      },
      {
        label: "Two-scope PBAC",
        tag: "Read",
        to: "/docs/concepts/two-scope-pbac",
      },
      {
        label: "Bounded contexts & DDD layering",
        tag: "Read",
        to: "/docs/concepts/bounded-contexts",
      },
      {
        label: "Unit of Work + event dispatch",
        tag: "Read",
        to: "/docs/concepts/unit-of-work",
      },
      {
        label: "Realtime events & presence",
        tag: "Read",
        to: "/docs/concepts/realtime-events",
      },
    ],
  },
  {
    kicker: "03 · Guides",
    title: "Extending the kit",
    description:
      "Recipes for the things you'll actually do next: adding a new bounded context, a new permission, a new billing plan, a new email template.",
    entries: [
      {
        label: "Add a bounded context",
        tag: "Guide",
        to: "/docs/guides/add-a-bounded-context",
      },
      {
        label: "Add a permission & role check",
        tag: "Guide",
        to: "/docs/guides/add-a-permission",
      },
      {
        label: "Add a plan + checkout button",
        tag: "Guide",
        to: "/docs/guides/add-a-plan",
      },
      {
        label: "Write a React Email template",
        tag: "Guide",
        to: "/docs/guides/add-an-email-template",
      },
      {
        label: "Write a graphile-worker job",
        tag: "Guide",
        to: "/docs/guides/write-a-job",
      },
    ],
  },
  {
    kicker: "04 · Reference",
    title: "API & schema reference",
    description:
      "Generated reference for the HTTP API, the Prisma schema, the shared DTO + permissions package, and the realtime event catalog.",
    status: "Generated",
    entries: [
      { label: "HTTP API (OpenAPI)", tag: "Reference" },
      { label: "Prisma schema", tag: "Reference" },
      { label: "@orbit/shared types & permissions", tag: "Reference" },
      { label: "Realtime event catalog", tag: "Reference" },
      { label: "features.json manifest", tag: "Reference" },
    ],
  },
  {
    kicker: "05 · Integrations",
    title: "Pluggable adapters",
    description:
      "How each provider port is shaped, and how to swap Stripe → Polar, Resend → your own SMTP, graphile-worker → QStash, etc.",
    entries: [
      {
        label: "Billing providers (Stripe / Polar / Dodo)",
        tag: "Guide",
        to: "/docs/integrations/billing",
      },
      {
        label: "Mailer port & Resend adapter",
        tag: "Guide",
        to: "/docs/integrations/mailer",
      },
      {
        label: "Jobs providers (graphile-worker / QStash)",
        tag: "Guide",
        to: "/docs/integrations/jobs",
      },
      {
        label: "Uploads (UploadThing)",
        tag: "Guide",
        to: "/docs/integrations/uploads",
      },
      {
        label: "OAuth providers (Google / Apple)",
        tag: "Guide",
        to: "/docs/integrations/oauth",
      },
    ],
  },
  {
    kicker: "06 · Deploy",
    title: "Ship to production",
    description:
      "Deploy targets we've verified, environment checklists, and the Postgres, secrets, and webhook routing you'll need.",
    entries: [
      {
        label: "Deploy the api (Fly / Railway / Render)",
        tag: "Guide",
        to: "/docs/deploy/api",
      },
      {
        label: "Deploy the web shells (Vercel / Cloudflare)",
        tag: "Guide",
        to: "/docs/deploy/web",
      },
      {
        label: "Postgres providers (Neon / Supabase / RDS)",
        tag: "Guide",
        to: "/docs/deploy/postgres",
      },
      {
        label: "Production webhook routing",
        tag: "Guide",
        to: "/docs/deploy/webhooks",
      },
      {
        label: "Secrets & rotation",
        tag: "Guide",
        to: "/docs/deploy/secrets",
      },
    ],
  },
];
