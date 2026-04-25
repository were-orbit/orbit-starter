import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { Button } from "@orbit/ui/button";
import { ParticleField } from "@orbit/ui/particle-field";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Database,
  Users,
  Zap,
} from "lucide-react";
import rocketSrc from "@/assets/figures/rocket.png";
import { CopyCommand } from "@/components/copy-command";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  BetterAuthMark,
  HonoMark,
  NextMark,
  PrismaMark,
  ResendMark,
  StripeMark,
  TailwindMark,
  TanStackMark,
} from "@/components/tech-marks";
import { CHECKOUT_URLS } from "@/lib/checkout";

export function LandingPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background font-mono text-foreground">
      <AmbientGrain />

      <SiteHeader />

      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pt-8 pb-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-16 md:px-12 md:pt-16 md:pb-20">
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] text-muted-foreground uppercase tracking-[0.2em] backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
            CLI · Next.js & TanStack · more frameworks soon
          </span>

          <h1 className="mt-6 font-medium text-4xl leading-[1.05] tracking-tight md:text-[56px]">
            Ship your SaaS{" "}
            <span className="text-muted-foreground">faster.</span> Focus on what
            matters.
          </h1>

          <p className="mt-6 max-w-lg text-muted-foreground text-sm leading-relaxed md:text-base">
            Orbit is a CLI that scaffolds a production-ready SaaS codebase —
            pick Next.js 16 or TanStack Start, pick your billing provider, get a
            typed monorepo with auth, multi-tenant workspaces, PBAC, Stripe,
            email, and realtime wired up on day one.
          </p>

          <div className="mt-6">
            <CopyCommand command="npx create-orb@latest" />
          </div>

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

          <div className="mt-10 text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
            No clutter. &nbsp;No config hell. &nbsp;Just ship.
          </div>
        </div>

        <div className="relative h-[420px] md:h-[560px]">
          <div className="absolute inset-0">
            <ParticleField
              src={rocketSrc}
              sampleStep={3}
              threshold={36}
              dotSize={1}
              renderScale={1}
              align="center"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(65% 55% at 50% 50%, transparent 55%, color-mix(in srgb, var(--background) 85%, transparent) 100%)",
            }}
          />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-14 md:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
          <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
            Built on
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 text-foreground/80 sm:grid-cols-4 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-4">
            {BUILT_ON.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 text-sm text-foreground/80"
              >
                <item.Mark className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-12">
        <div className="border-t border-border/60 pt-10">
          <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
            Built for SaaS
          </div>

          <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col gap-3">
                <f.Icon
                  className="h-5 w-5 text-foreground"
                  strokeWidth={1.5}
                />
                <div className="font-medium text-foreground text-sm">
                  {f.title}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const BUILT_ON = [
  { name: "Next.js", Mark: NextMark },
  { name: "TanStack", Mark: TanStackMark },
  { name: "Hono", Mark: HonoMark },
  { name: "Prisma", Mark: PrismaMark },
  { name: "Stripe", Mark: StripeMark },
  { name: "better-auth", Mark: BetterAuthMark },
  { name: "Resend", Mark: ResendMark },
  { name: "Tailwind", Mark: TailwindMark },
];

const FEATURES = [
  {
    Icon: Users,
    title: "Auth & Users",
    body: "better-auth with magic links, OAuth (Google, Apple), email+password, and an admin plugin.",
  },
  {
    Icon: CreditCard,
    title: "Subscriptions",
    body: "Stripe, Polar, or Dodo Payments — same port. Checkout, customer portal, and signed webhooks.",
  },
  {
    Icon: BarChart3,
    title: "Dashboard UI",
    body: "~55 cossui components, settings screens, workspace onboarding, invites, and a billing UI.",
  },
  {
    Icon: Database,
    title: "Database & ORM",
    body: "Prisma 7 + Postgres with a typed schema, branded IDs, DDD bounded contexts, and Unit of Work.",
  },
  {
    Icon: Zap,
    title: "Developer Experience",
    body: "TypeScript 6, Turbo, Vite, vitest, feature flags via inline fences the CLI strips on scaffold.",
  },
];
