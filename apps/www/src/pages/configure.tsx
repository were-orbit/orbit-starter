import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { Button } from "@orbit/ui/button";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { CHECKOUT_URLS } from "@/lib/checkout";

type State = {
  projectName: string;
  framework: "tanstack" | "next";
  orm: "prisma" | "drizzle";
  billing: "stripe" | "polar" | "dodo" | "none";
  jobs: "graphile" | "qstash" | "none";
  rateLimit: "memory" | "upstash" | "unkey" | "none";
  teams: boolean;
  realtime: boolean;
  uploads: boolean;
  emailResend: boolean;
  waitlist: boolean;
  auditLog: boolean;
  authMagicLink: boolean;
  authPassword: boolean;
  authOAuth: boolean;
  authAdmin: boolean;
};

const DEFAULTS: State = {
  projectName: "my-saas",
  framework: "tanstack",
  orm: "prisma",
  billing: "stripe",
  jobs: "graphile",
  rateLimit: "memory",
  teams: true,
  realtime: true,
  uploads: true,
  emailResend: true,
  waitlist: false,
  auditLog: true,
  authMagicLink: true,
  authPassword: false,
  authOAuth: true,
  authAdmin: true,
};

function yn(on: boolean): string {
  return on ? "yes" : "no";
}

function buildFlags(s: State): string[] {
  const flags: string[] = [];

  if (s.framework !== DEFAULTS.framework)
    flags.push(`--framework=${s.framework}`);

  if (s.orm !== DEFAULTS.orm) flags.push(`--orm-provider=${s.orm}`);

  if (s.billing === "none") flags.push("--billing=no");
  else if (s.billing !== DEFAULTS.billing)
    flags.push(`--billing-provider=${s.billing}`);

  if (s.jobs === "none") flags.push("--jobs=no");
  else if (s.jobs !== DEFAULTS.jobs)
    flags.push(`--jobs-provider=${s.jobs}`);

  if (s.rateLimit === "none") flags.push("--rate-limit=no");
  else if (s.rateLimit !== DEFAULTS.rateLimit)
    flags.push(`--rate-limit-provider=${s.rateLimit}`);

  if (s.teams !== DEFAULTS.teams) flags.push(`--teams=${yn(s.teams)}`);
  if (s.realtime !== DEFAULTS.realtime)
    flags.push(`--realtime=${yn(s.realtime)}`);
  if (s.uploads !== DEFAULTS.uploads)
    flags.push(`--uploads=${yn(s.uploads)}`);
  if (s.emailResend !== DEFAULTS.emailResend)
    flags.push(`--email-resend=${yn(s.emailResend)}`);
  if (s.waitlist !== DEFAULTS.waitlist)
    flags.push(`--waitlist=${yn(s.waitlist)}`);
  if (s.auditLog !== DEFAULTS.auditLog)
    flags.push(`--audit-log=${yn(s.auditLog)}`);

  if (s.authMagicLink !== DEFAULTS.authMagicLink)
    flags.push(`--auth-magic-link=${yn(s.authMagicLink)}`);
  if (s.authPassword !== DEFAULTS.authPassword)
    flags.push(`--auth-password=${yn(s.authPassword)}`);
  if (s.authOAuth !== DEFAULTS.authOAuth)
    flags.push(`--auth-oauth=${yn(s.authOAuth)}`);
  if (s.authAdmin !== DEFAULTS.authAdmin)
    flags.push(`--auth-admin=${yn(s.authAdmin)}`);

  return flags;
}

function buildCommand(s: State): string {
  const name = s.projectName.trim() || "my-saas";
  const flags = buildFlags(s);
  const header = `npx create-orb@latest ${name}`;
  if (flags.length === 0) return header;
  return `${header} \\\n  ${flags.join(" \\\n  ")}`;
}

export function ConfigurePage() {
  const [state, setState] = useState<State>(DEFAULTS);
  const [copied, setCopied] = useState(false);

  const command = useMemo(() => buildCommand(state), [state]);
  const flagsCount = useMemo(() => buildFlags(state).length, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command.replace(/ \\\n\s+/g, " "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const reset = () => setState(DEFAULTS);

  return (
    <div className="relative min-h-svh overflow-x-clip bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader active="/configure" />

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-10 pb-10 md:px-12 md:pt-16 md:pb-14">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          Configure
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          Pick what you need.{" "}
          <span className="text-muted-foreground">Copy the command.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Toggle features, pick a framework, pick a billing provider. The CLI
          command below updates live — run it once and your repo has exactly
          what you chose, nothing more.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
            Free — public starter repo
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/90" />
            Paid — unlocked with a license
          </span>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-12">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="flex flex-col gap-6">
            <Group label="Project" kicker="01">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="project-name"
                  className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
                >
                  Directory name
                </label>
                <input
                  id="project-name"
                  value={state.projectName}
                  onChange={(e) =>
                    setState({ ...state, projectName: e.target.value })
                  }
                  spellCheck={false}
                  autoComplete="off"
                  className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="my-saas"
                />
              </div>
            </Group>

            <Group
              label="Frontend framework"
              kicker="02"
              help="Pick the shell that lands in apps/web. The other one is stripped."
            >
              <Radio
                value={state.framework}
                onChange={(v) =>
                  setState({ ...state, framework: v as State["framework"] })
                }
                options={[
                  { value: "tanstack", label: "TanStack Start", sub: "Default · Vite + router" },
                  { value: "next", label: "Next.js 16", sub: "App Router + Turbopack" },
                ]}
              />
            </Group>

            <Group
              label="ORM"
              kicker="03"
              help="One repository port per aggregate. Pick one ORM — the other is stripped."
            >
              <Radio
                value={state.orm}
                onChange={(v) =>
                  setState({ ...state, orm: v as State["orm"] })
                }
                options={[
                  { value: "prisma", label: "Prisma", sub: "Default · DMMF client + migrations" },
                  { value: "drizzle", label: "Drizzle", sub: "SQL-first, smaller runtime", tier: "paid" },
                ]}
              />
            </Group>

            <Group
              label="Authentication"
              kicker="04"
              help="better-auth under the hood. Toggle providers on or off."
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Toggle
                  active={state.authMagicLink}
                  onToggle={() =>
                    setState({ ...state, authMagicLink: !state.authMagicLink })
                  }
                  label="Magic link"
                  sub="Passwordless email"
                />
                <Toggle
                  active={state.authPassword}
                  onToggle={() =>
                    setState({ ...state, authPassword: !state.authPassword })
                  }
                  label="Email + password"
                  sub="Classic auth"
                />
                <Toggle
                  active={state.authOAuth}
                  onToggle={() =>
                    setState({ ...state, authOAuth: !state.authOAuth })
                  }
                  label="OAuth"
                  sub="Google + Apple"
                />
                <Toggle
                  active={state.authAdmin}
                  onToggle={() =>
                    setState({ ...state, authAdmin: !state.authAdmin })
                  }
                  label="Admin plugin"
                  sub="Impersonate, list users"
                />
              </div>
            </Group>

            <Group
              label="Billing"
              kicker="05"
              help="Pick a provider — or turn billing off entirely."
            >
              <Radio
                value={state.billing}
                onChange={(v) =>
                  setState({ ...state, billing: v as State["billing"] })
                }
                options={[
                  { value: "stripe", label: "Stripe", sub: "Default", tier: "paid" },
                  { value: "polar", label: "Polar", sub: "Merchant of record", tier: "paid" },
                  { value: "dodo", label: "Dodo", sub: "Merchant of record", tier: "paid" },
                  { value: "none", label: "None", sub: "Skip billing entirely" },
                ]}
              />
            </Group>

            <Group
              label="Background jobs"
              kicker="06"
              help="Queue + cron behind a port. Pick the runtime or skip jobs."
            >
              <Radio
                value={state.jobs}
                onChange={(v) =>
                  setState({ ...state, jobs: v as State["jobs"] })
                }
                options={[
                  { value: "graphile", label: "graphile-worker", sub: "Default · Postgres", tier: "paid" },
                  { value: "qstash", label: "Upstash QStash", sub: "Managed HTTP queue", tier: "paid" },
                  { value: "none", label: "None", sub: "Skip jobs" },
                ]}
              />
            </Group>

            <Group
              label="Rate limiting"
              kicker="07"
              help="RateLimiter port guarding auth + waitlist routes. Pick an adapter or skip it."
            >
              <Radio
                value={state.rateLimit}
                onChange={(v) =>
                  setState({ ...state, rateLimit: v as State["rateLimit"] })
                }
                options={[
                  { value: "memory", label: "In-memory", sub: "Default · dev / single-instance", tier: "paid" },
                  { value: "upstash", label: "Upstash Redis", sub: "Sliding window, shared across workers", tier: "paid" },
                  { value: "unkey", label: "Unkey", sub: "Per-key quotas, managed dashboard", tier: "paid" },
                  { value: "none", label: "None", sub: "Skip rate limiting" },
                ]}
              />
            </Group>

            <Group
              label="Everything else"
              kicker="08"
              help="Toggle optional features. Defaults match most SaaS products."
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Toggle
                  active={state.teams}
                  onToggle={() => setState({ ...state, teams: !state.teams })}
                  label="Teams"
                  sub="Per-team PBAC"
                  tier="paid"
                />
                <Toggle
                  active={state.realtime}
                  onToggle={() =>
                    setState({ ...state, realtime: !state.realtime })
                  }
                  label="Realtime"
                  sub="WebSocket + presence"
                />
                <Toggle
                  active={state.uploads}
                  onToggle={() =>
                    setState({ ...state, uploads: !state.uploads })
                  }
                  label="File uploads"
                  sub="UploadThing"
                  tier="paid"
                />
                <Toggle
                  active={state.emailResend}
                  onToggle={() =>
                    setState({ ...state, emailResend: !state.emailResend })
                  }
                  label="Transactional email"
                  sub="Resend"
                  tier="paid"
                />
                <Toggle
                  active={state.waitlist}
                  onToggle={() =>
                    setState({ ...state, waitlist: !state.waitlist })
                  }
                  label="Waitlist"
                  sub="Private-beta gating"
                  tier="paid"
                />
                <Toggle
                  active={state.auditLog}
                  onToggle={() =>
                    setState({ ...state, auditLog: !state.auditLog })
                  }
                  label="Audit log"
                  sub="Append-only ledger · workspace + app scope"
                  tier="paid"
                />
              </div>
            </Group>
          </div>

          <aside className="lg:sticky lg:top-8">
            <div className="rounded-xl border border-border/60 bg-card/40 not-dark:bg-clip-padding">
              <div className="flex items-center justify-between border-border/60 border-b px-4 py-3">
                <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
                  Your command
                </div>
                <div className="flex items-center gap-2">
                  {flagsCount > 0 && (
                    <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                      {flagsCount} flag{flagsCount === 1 ? "" : "s"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[11px] text-muted-foreground uppercase tracking-[0.2em] transition-colors hover:text-foreground"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 py-4 text-xs leading-relaxed text-foreground">
                <span className="text-muted-foreground">$ </span>
                <code>{command}</code>
              </pre>

              <div className="flex items-center justify-between gap-2 border-border/60 border-t px-4 py-3">
                <span className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                  {copied ? "Copied" : "Copy & paste into your terminal"}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  aria-label={copied ? "Copied" : "Copy command"}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 text-xs text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                render={
                  <a href={CHECKOUT_URLS.builder}>
                    Get access
                    <ArrowRight />
                  </a>
                }
              />
              <Button
                variant="outline"
                size="sm"
                render={<a href="/tech-stack">See the stack</a>}
              />
            </div>

            <p className="mt-4 text-muted-foreground text-xs leading-relaxed">
              Defaults are omitted from the command — every flag you see is a
              deviation from the default scaffold.
            </p>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Group({
  label,
  kicker,
  help,
  children,
}: {
  label: string;
  kicker: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/30 p-5 not-dark:bg-clip-padding md:p-6">
      <div className="flex items-baseline justify-between gap-4 border-border/60 border-b pb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[11px] text-muted-foreground tabular-nums tracking-[0.15em]">
            {kicker}
          </span>
          <div className="font-medium text-foreground text-sm">{label}</div>
        </div>
      </div>
      {help && (
        <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
          {help}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TierBadge({ tier }: { tier: "free" | "paid" }) {
  return (
    <span
      className={
        tier === "free"
          ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/5 px-2 py-0.5 text-[9px] text-emerald-400 uppercase tracking-[0.2em]"
          : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/5 px-2 py-0.5 text-[9px] text-amber-400 uppercase tracking-[0.2em]"
      }
    >
      <span
        className={
          tier === "free"
            ? "inline-block h-1 w-1 rounded-full bg-emerald-400"
            : "inline-block h-1 w-1 rounded-full bg-amber-400"
        }
      />
      {tier}
    </span>
  );
}

function Radio<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; sub?: string; tier?: "free" | "paid" }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={
              active
                ? "flex flex-col items-start gap-0.5 rounded-lg border border-foreground/40 bg-foreground/5 px-3 py-2.5 text-left transition-colors"
                : "flex flex-col items-start gap-0.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-accent/30"
            }
          >
            <span className="flex w-full items-start justify-between gap-2">
              <span
                className={
                  active
                    ? "text-foreground text-sm"
                    : "text-foreground/80 text-sm"
                }
              >
                {opt.label}
              </span>
              {opt.tier && <TierBadge tier={opt.tier} />}
            </span>
            {opt.sub && (
              <span className="text-[11px] text-muted-foreground">
                {opt.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  active,
  onToggle,
  label,
  sub,
  tier,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  sub?: string;
  tier?: "free" | "paid";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={
        active
          ? "group flex items-center justify-between gap-3 rounded-lg border border-foreground/40 bg-foreground/5 px-3 py-2.5 text-left transition-colors"
          : "group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-accent/30"
      }
    >
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span
            className={
              active ? "text-foreground text-sm" : "text-foreground/80 text-sm"
            }
          >
            {label}
          </span>
          {tier && <TierBadge tier={tier} />}
        </span>
        {sub && (
          <span className="text-[11px] text-muted-foreground">{sub}</span>
        )}
      </span>
      <span
        className={
          active
            ? "inline-flex h-5 w-9 items-center rounded-full bg-foreground transition-colors"
            : "inline-flex h-5 w-9 items-center rounded-full bg-border transition-colors"
        }
      >
        <span
          className={
            active
              ? "ml-[18px] inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform"
              : "ml-0.5 inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform"
          }
        />
      </span>
    </button>
  );
}
