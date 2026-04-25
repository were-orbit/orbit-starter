import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { Button } from "@orbit/ui/button";
import {
  ArrowRight,
  Building2,
  CreditCard,
  Database,
  Gauge,
  KeyRound,
  Layers,
  Mail,
  Radio,
  ScrollText,
  ShieldCheck,
  Timer,
  UploadCloud,
  Users,
  Zap,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { CHECKOUT_URLS } from "@/lib/checkout";

export function FeaturesPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader active="/features" />

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-10 pb-14 md:px-12 md:pt-16 md:pb-20">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          Features
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          Everything a SaaS needs,{" "}
          <span className="text-muted-foreground">already built.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Orbit ships the parts of a SaaS you always have to build anyway — and
          leaves the product to you. Every feature below is toggleable at
          scaffold time via the CLI, so you only keep what you need.
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
            render={<a href="/tech-stack">See the stack</a>}
          />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-12">
        <div className="mb-6 flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
            Free — public starter repo
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/90" />
            Paid — unlocked with a license
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/30 p-6 not-dark:bg-clip-padding"
            >
              <div className="flex items-start justify-between gap-3">
                <f.Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span
                  className={
                    f.tier === "free"
                      ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/5 px-2 py-0.5 text-[9px] text-emerald-400 uppercase tracking-[0.2em]"
                      : "inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/5 px-2 py-0.5 text-[9px] text-amber-400 uppercase tracking-[0.2em]"
                  }
                >
                  <span
                    className={
                      f.tier === "free"
                        ? "inline-block h-1 w-1 rounded-full bg-emerald-400"
                        : "inline-block h-1 w-1 rounded-full bg-amber-400"
                    }
                  />
                  {f.tier}
                </span>
              </div>
              <div className="font-medium text-foreground text-sm">
                {f.title}
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {f.body}
              </p>
              {f.tags && (
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-border/60 px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

type Feature = {
  Icon: typeof KeyRound;
  title: string;
  body: string;
  tier: "free" | "paid";
  tags?: string[];
};

const FEATURES: Feature[] = [
  {
    Icon: KeyRound,
    title: "Authentication",
    body: "better-auth under the hood. Magic links, email+password, OAuth (Google + Apple), and an admin plugin for impersonation — all free.",
    tier: "free",
    tags: ["better-auth", "OAuth", "Magic link"],
  },
  {
    Icon: Building2,
    title: "Multi-tenant workspaces",
    body: "Workspace is the tenant root. Slug-based URLs, ownership transfer, member management, and invite flows wired end-to-end.",
    tier: "free",
    tags: ["Tenancy", "Invites"],
  },
  {
    Icon: ShieldCheck,
    title: "Workspace PBAC",
    body: "Permission-based access control at workspace scope. System roles (OWNER/ADMIN/MEMBER) plus custom roles. Checked in one place on the server, surfaced by useCan() hooks on the client.",
    tier: "free",
    tags: ["PBAC", "Roles"],
  },
  {
    Icon: Radio,
    title: "Realtime & presence",
    body: "In-process WebSocket hub broadcasts domain events to workspace channels. Presence tracker with a 30-second grace window, heartbeat every 25s.",
    tier: "free",
    tags: ["WebSocket", "Presence"],
  },
  {
    Icon: Database,
    title: "Typed data model",
    body: "Prisma 7 schema with branded, prefixed UUIDv7 IDs. DDD bounded contexts with a shared Unit of Work that dispatches domain events post-commit.",
    tier: "free",
    tags: ["Prisma", "DDD", "UoW"],
  },
  {
    Icon: Zap,
    title: "DX that just works",
    body: "Turborepo, Vite, TypeScript 6, vitest, coss ui (coss.com/ui) + Base UI, Tailwind v4, and a single npm run dev that starts api, web, www, and webhook tunnel.",
    tier: "free",
    tags: ["Turbo", "Vitest", "Tailwind v4"],
  },
  {
    Icon: Users,
    title: "Teams inside workspaces",
    body: "Second tier of grouping — each team carries its own roles, members, and permission set, nested under a workspace. Adds a second PBAC scope.",
    tier: "paid",
    tags: ["Teams", "Team PBAC"],
  },
  {
    Icon: CreditCard,
    title: "Subscriptions & billing",
    body: "Stripe, Polar, or Dodo Payments — same BillingProvider port. Checkout sessions, customer portals, signature-verified webhooks, and an append-only billing event ledger.",
    tier: "paid",
    tags: ["Stripe", "Polar", "Dodo"],
  },
  {
    Icon: Mail,
    title: "Transactional email",
    body: "Mailer is a port. Ships with a Resend adapter and React Email templates for magic links and workspace invites. Free tier logs emails to stdout in dev.",
    tier: "paid",
    tags: ["Resend", "React Email"],
  },
  {
    Icon: UploadCloud,
    title: "File uploads",
    body: "UploadThing wiring for avatars and workspace assets, behind a clean Uploads bounded context so you can swap providers without touching product code.",
    tier: "paid",
    tags: ["UploadThing"],
  },
  {
    Icon: Timer,
    title: "Background jobs & cron",
    body: "Jobs behind a port. graphile-worker by default (Postgres-backed, with cron) and an Upstash QStash adapter for serverless deploys.",
    tier: "paid",
    tags: ["graphile-worker", "QStash"],
  },
  {
    Icon: Gauge,
    title: "Rate limiting",
    body: "RateLimiter port with an in-memory fallback for dev and Upstash Redis or Unkey adapters for production. Auth and waitlist endpoints ship with layered per-IP and per-email limits so one address can't be ground down by a botnet.",
    tier: "paid",
    tags: ["Upstash", "Unkey", "Sliding window"],
  },
  {
    Icon: ScrollText,
    title: "Audit log",
    body: "Append-only ledger at two scopes. A workspace-scoped log for tenant admins and an app-wide log for platform moderation. Entries are materialised by a post-commit projector listening to domain events, so services never write audit rows directly. Permission-gated view + export.",
    tier: "paid",
    tags: ["Compliance", "Event bus", "Append-only"],
  },
  {
    Icon: Layers,
    title: "Modular by design",
    body: "The CLI only includes the features you picked — no dead code, no config flags, no runtime overhead. Turn billing off and the folder, routes, env vars, and Prisma models all vanish from your project.",
    tier: "free",
    tags: ["CLI", "Scaffolding"],
  },
];
