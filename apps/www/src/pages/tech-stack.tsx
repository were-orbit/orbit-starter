import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { Button } from "@orbit/ui/button";
import { ArrowRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { CHECKOUT_URLS } from "@/lib/checkout";

export function TechStackPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader active="/tech-stack" />

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-10 pb-14 md:px-12 md:pt-16 md:pb-20">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          Tech Stack
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          Opinionated on the parts that don't matter,{" "}
          <span className="text-muted-foreground">flexible on the ones that do.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Orbit is built on libraries you'd pick anyway. Pick your frontend
          framework at scaffold time. Swap billing, jobs, email, or uploads by
          replacing one adapter — each lives behind a port.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            size="lg"
            render={
              <a href={CHECKOUT_URLS.builder}>
                Get started
                <ArrowRight />
              </a>
            }
          />
          <Button
            variant="outline"
            size="lg"
            render={<a href="/configure">Configure yours</a>}
          />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 md:px-12">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 md:grid-cols-2">
          {GROUPS.map((group) => (
            <div key={group.title} className="bg-background p-6 md:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-medium text-foreground text-sm">
                  {group.title}
                </div>
                {group.meta && (
                  <div className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                    {group.meta}
                  </div>
                )}
              </div>
              <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                {group.blurb}
              </p>
              <ul className="mt-5 divide-y divide-border/60 border-border/60 border-t text-sm">
                {group.items.map((item) => (
                  <li
                    key={item.name}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {item.name}
                      </div>
                      <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                        {item.note}
                      </p>
                    </div>
                    {item.tag && (
                      <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                        {item.tag}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const GROUPS: {
  title: string;
  blurb: string;
  meta?: string;
  items: { name: string; note: string; tag?: string }[];
}[] = [
  {
    title: "Frontend",
    blurb: "Pick one — or keep both. Framework is chosen at scaffold time.",
    meta: "Choose one",
    items: [
      {
        name: "Next.js 16",
        note: "App Router + Turbopack. Server components, server actions, the usual.",
        tag: "Option",
      },
      {
        name: "TanStack Start",
        note: "Vite + TanStack Router file-based routes. Fully client-first with an SSR story.",
        tag: "Option",
      },
      {
        name: "React 19",
        note: "Shared across both shells. Strict mode on.",
      },
      {
        name: "Tailwind CSS v4",
        note: "New engine, design tokens in CSS, no tailwind.config.js.",
      },
      {
        name: "cossui",
        note: "~55 accessible components in packages/ui, yours to own and extend.",
      },
      {
        name: "TanStack Query & Router",
        note: "Server state + typed client routing (Router on the Start shell).",
      },
    ],
  },
  {
    title: "Backend",
    blurb: "Hono on Node, typed end-to-end. No framework magic.",
    items: [
      { name: "Hono 4", note: "Fast, type-safe routing. Node adapter + WS upgrade." },
      { name: "TypeScript 6", note: "Strict settings across every workspace." },
      { name: "Zod 4", note: "Runtime validation at the HTTP boundary." },
      { name: "ws", note: "Native WebSocket server for the realtime hub." },
    ],
  },
  {
    title: "Database",
    blurb: "One Postgres database, one Prisma schema, branded IDs throughout.",
    items: [
      { name: "PostgreSQL", note: "You bring the database. Any Postgres works." },
      { name: "Prisma 7", note: "Schema, migrations, generated client in apps/api." },
      {
        name: "UUIDv7 + prefixes",
        note: "Typed branded IDs: ws_*, team_*, mbr_*, sub_*, etc.",
      },
    ],
  },
  {
    title: "Auth",
    blurb: "better-auth does the hard parts. Providers are feature-flagged.",
    items: [
      { name: "better-auth", note: "Sessions, cookies, OAuth, magic link, admin plugin." },
      { name: "Magic link", note: "Passwordless email. Dev endpoint logs the URL in console.", tag: "Default" },
      { name: "OAuth", note: "Google + Apple wired in. Buttons hide when creds are missing.", tag: "Default" },
      { name: "Email + password", note: "Optional. Stored on the accounts table." },
    ],
  },
  {
    title: "Billing",
    blurb: "Subscriptions behind a BillingProvider port. Pick one adapter.",
    meta: "Choose one",
    items: [
      { name: "Stripe", note: "The default. Checkout, portal, subscription webhooks.", tag: "Default" },
      { name: "Polar", note: "Merchant-of-record, indie-friendly pricing.", tag: "Option" },
      { name: "Dodo Payments", note: "Merchant-of-record via a Stainless-generated SDK.", tag: "Option" },
      { name: "BillingEvent ledger", note: "Append-only row-per-webhook, idempotent and audit-friendly." },
    ],
  },
  {
    title: "Email",
    blurb: "Mailer is a port. Templates are plain React components.",
    items: [
      { name: "Resend", note: "Default adapter. Swap for anything that sends mail.", tag: "Default" },
      { name: "React Email", note: "Components for magic-link and invite templates." },
      { name: "Console mailer", note: "Fallback adapter used in dev — emails print to stdout." },
    ],
  },
  {
    title: "Jobs & cron",
    blurb: "Background work behind a JobQueue / JobRuntime pair.",
    meta: "Choose one",
    items: [
      { name: "graphile-worker", note: "Postgres-backed queue with cron. Zero extra infra.", tag: "Default" },
      { name: "Upstash QStash", note: "Managed HTTP queue. Great for serverless.", tag: "Option" },
      { name: "No-op runtime", note: "Inline execution for tests and seeds." },
    ],
  },
  {
    title: "Uploads",
    blurb: "One provider today, pluggable via an Uploads bounded context.",
    items: [
      { name: "UploadThing", note: "Presigned uploads, typed router, avatars out of the box." },
    ],
  },
  {
    title: "Tooling & CI",
    blurb: "The bits that make a monorepo actually work.",
    items: [
      { name: "Turborepo", note: "Pipelines for dev, build, typecheck, lint." },
      { name: "Vite 8", note: "Dev server for the TanStack shells and www." },
      { name: "Vitest 4", note: "Unit + integration tests for the api workspace." },
      { name: "tsx", note: "Zero-config TypeScript runner for api dev and scripts." },
    ],
  },
  {
    title: "Icons, fonts, utilities",
    blurb: "Small choices you don't have to re-make.",
    items: [
      { name: "lucide-react", note: "Icon set used across ui and www." },
      { name: "Geist + Inter", note: "Variable fonts, self-hosted via @fontsource-variable." },
      { name: "CVA + tailwind-merge", note: "Variant APIs for the ui package." },
    ],
  },
];
