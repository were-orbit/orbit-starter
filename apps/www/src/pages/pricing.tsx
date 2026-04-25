import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { Button } from "@orbit/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { CHECKOUT_URLS, type CheckoutTier } from "@/lib/checkout";

export function PricingPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader active="/pricing" />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-10 text-center md:px-12 md:pt-16 md:pb-14">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          Pricing
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          One purchase.{" "}
          <span className="text-muted-foreground">Unlimited SaaS.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Buy access to the CLI once. Scaffold as many products as you want.
          Lifetime updates for the life of the project.
        </p>
      </section>

      <section className="relative z-10 mx-auto grid max-w-4xl grid-cols-1 items-stretch gap-6 px-6 pb-10 md:grid-cols-2 md:px-12">
        {TIERS.map((tier) => (
          <article
            key={tier.name}
            className={
              tier.highlight
                ? "relative flex flex-col rounded-2xl border border-foreground/40 bg-card/60 p-8 not-dark:bg-clip-padding shadow-xs/5"
                : "relative flex flex-col rounded-2xl border border-border/60 bg-card/30 p-8 not-dark:bg-clip-padding"
            }
          >
            {tier.launchPrice ? (
              <span className="absolute -top-3 left-8 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-background px-3 py-1 text-[10px] text-amber-400 uppercase tracking-[0.2em]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span suppressHydrationWarning>
                  Launch price · {daysUntilIncrease()} days left
                </span>
              </span>
            ) : tier.highlight ? (
              <span className="absolute -top-3 left-8 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                Most popular
              </span>
            ) : null}
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
                {tier.kicker}
              </div>
            </div>
            <div className="mt-3 font-medium text-foreground text-lg">
              {tier.name}
            </div>
            <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
              {tier.description}
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-medium text-4xl leading-none tracking-tight md:text-5xl">
                {tier.price}
              </span>
              <span className="text-muted-foreground text-xs">
                · {tier.cadence}
              </span>
            </div>
            {tier.launchPrice && (
              <div className="mt-3 text-muted-foreground text-xs leading-relaxed">
                Goes up to{" "}
                <span className="text-foreground/90">
                  {tier.launchPrice.fullPrice}
                </span>{" "}
                on {tier.launchPrice.endsOn}.
              </div>
            )}

            <ul className="mt-8 space-y-3 text-sm">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 h-4 w-4 text-foreground"
                    strokeWidth={1.75}
                  />
                  <span className="text-foreground/90">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <Button
                size="lg"
                variant={tier.highlight ? "default" : "outline"}
                className="w-full"
                render={
                  <a
                    href={tier.href ?? CHECKOUT_URLS[tier.key as CheckoutTier]}
                    {...(tier.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {tier.cta}
                    <ArrowRight />
                  </a>
                }
              />
              <p className="mt-3 text-center text-muted-foreground text-xs">
                {tier.fineprint}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 text-center md:px-12">
        <p className="text-muted-foreground text-xs">
          Student? Email us from your education address{" "}
          <a
            href="mailto:students@wereorbit.com"
            className="text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
          >
            students@wereorbit.com
          </a>{" "}
          for free access.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 md:px-12">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          FAQ
        </div>
        <ul className="mt-4 divide-y divide-border/60 border-border/60 border-y text-sm">
          {FAQ.map((item, i) => (
            <li
              key={item.question}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-6 py-6"
            >
              <span className="text-[11px] text-muted-foreground tabular-nums tracking-[0.15em]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="font-medium">{item.question}</div>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter />
    </div>
  );
}

type Tier = {
  key: CheckoutTier | "starter";
  kicker: string;
  name: string;
  description: string;
  price: string;
  cadence: string;
  features: string[];
  cta: string;
  fineprint: string;
  highlight: boolean;
  href?: string;
  external?: boolean;
  launchPrice?: { fullPrice: string; endsOn: string };
};

const PRICE_INCREASE_DATE = new Date("2026-04-30T00:00:00Z");
const PRICE_INCREASE_LABEL = "Apr 30";

function daysUntilIncrease(): number {
  const diff = PRICE_INCREASE_DATE.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const TIERS: Tier[] = [
  {
    key: "starter",
    kicker: "Open source",
    name: "Starter",
    description:
      "The public starter repo. Auth, workspaces, PBAC, realtime — everything you need to boot a multi-tenant SaaS shell.",
    price: "$0",
    cadence: "free, forever",
    features: [
      "Magic-link + OAuth auth (Google, Apple)",
      "Multi-tenant workspaces + workspace PBAC",
      "Realtime hub + presence",
      "Pick TanStack Start or Next 16",
      "MIT-licensed, clone and go",
    ],
    cta: "View on GitHub",
    fineprint: "No signup, no license key.",
    highlight: false,
    href: "https://github.com/were-orbit/orbit-starter",
    external: true,
  },
  {
    key: "builder",
    kicker: "Commercial",
    name: "Builder",
    description:
      "Unlocks the commercial bits — teams, billing, jobs, uploads, Resend. One-time payment, lifetime updates, unlimited projects.",
    price: "$50",
    cadence: "one-time",
    features: [
      "Everything in Starter",
      "Teams + second PBAC scope",
      "Billing (Stripe / Polar / Dodo)",
      "Background jobs (graphile / QStash)",
      "UploadThing + Resend adapters",
      "Private GitHub read access",
      "Every future update, free",
    ],
    cta: "Get Builder",
    fineprint: "One-time payment, lifetime updates.",
    highlight: true,
    launchPrice: { fullPrice: "$124.58", endsOn: PRICE_INCREASE_LABEL },
  },
];

const FAQ = [
  {
    question: "What's actually in the free Starter?",
    answer:
      "The whole auth + tenancy + realtime backbone: better-auth with magic links and OAuth, multi-tenant workspaces with PBAC, the WebSocket hub with presence, both frontend shells, and the DDD / Unit-of-Work layering you'd build yourself anyway. It's on github.com/were-orbit/orbit-starter under MIT — clone it, keep it, do whatever. A paid license unlocks the commercial bits: teams, billing, jobs, uploads, Resend.",
  },
  {
    question: "Is this a subscription?",
    answer:
      "No — one-time payment for the paid tiers. You pay once, keep the CLI, and get every update we ship thereafter. The free Starter is free forever.",
  },
  {
    question: "How many products can I build with it?",
    answer:
      "Unlimited. One purchase covers every SaaS you scaffold, as long as you don't redistribute the starter itself.",
  },
  {
    question: "Which frameworks are supported today?",
    answer:
      "Next.js 16 (App Router) and TanStack Start. You pick one at scaffold time and the CLI strips the other. More frameworks coming soon — Remix/React Router v7 is next on the list.",
  },
  {
    question: "Can I pick which billing provider ships?",
    answer:
      "Yes. Stripe is the default, but you can scaffold with Polar or Dodo Payments instead — they implement the same BillingProvider port.",
  },
  {
    question: "Do I get future updates?",
    answer:
      "Yes. Lifetime updates. Every new adapter, framework, and bounded context we ship lands in your CLI.",
  },
  {
    question: "What if I get stuck?",
    answer:
      "Team purchases include priority support on Discord. Everyone gets access to the public docs, the GitHub discussions, and the changelog.",
  },
];
