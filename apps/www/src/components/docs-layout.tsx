import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import type { ReactNode } from "react";
import { OrmProvider } from "@/components/orm-tabs";
import { SiteFooter, SiteHeader } from "@/components/site-header";

type DocsEntry = { label: string; to?: string };
type DocsGroup = { kicker: string; entries: DocsEntry[] };

export const DOCS_NAV: DocsGroup[] = [
  {
    kicker: "01 · Getting started",
    entries: [
      { label: "Quickstart", to: "/docs/getting-started/quickstart" },
      { label: "Prerequisites", to: "/docs/getting-started/prerequisites" },
      { label: "Running the CLI", to: "/docs/getting-started/running-the-cli" },
      {
        label: "Environment variables",
        to: "/docs/getting-started/environment-variables",
      },
      {
        label: "First migration + seed",
        to: "/docs/getting-started/first-migration-and-seed",
      },
      { label: "npm run dev", to: "/docs/getting-started/dev-server" },
    ],
  },
  {
    kicker: "02 · Concepts",
    entries: [
      {
        label: "Workspaces, teams & tenancy",
        to: "/docs/concepts/workspaces-teams-tenancy",
      },
      { label: "Two-scope PBAC", to: "/docs/concepts/two-scope-pbac" },
      {
        label: "Bounded contexts & DDD",
        to: "/docs/concepts/bounded-contexts",
      },
      { label: "Unit of Work + events", to: "/docs/concepts/unit-of-work" },
      { label: "Realtime & presence", to: "/docs/concepts/realtime-events" },
    ],
  },
  {
    kicker: "03 · Guides",
    entries: [
      {
        label: "Add a bounded context",
        to: "/docs/guides/add-a-bounded-context",
      },
      {
        label: "Add a permission & role check",
        to: "/docs/guides/add-a-permission",
      },
      {
        label: "Add a plan + checkout button",
        to: "/docs/guides/add-a-plan",
      },
      {
        label: "Write a React Email template",
        to: "/docs/guides/add-an-email-template",
      },
      {
        label: "Write a graphile-worker job",
        to: "/docs/guides/write-a-job",
      },
    ],
  },
  {
    kicker: "04 · Reference",
    entries: [
      { label: "HTTP API (OpenAPI)" },
      { label: "Prisma schema" },
      { label: "@orbit/shared types & permissions" },
      { label: "Realtime event catalog" },
      { label: "features.json manifest" },
    ],
  },
  {
    kicker: "05 · Integrations",
    entries: [
      { label: "ORM (Prisma or Drizzle)", to: "/docs/integrations/orm" },
      { label: "Billing providers", to: "/docs/integrations/billing" },
      { label: "Mailer port & Resend", to: "/docs/integrations/mailer" },
      { label: "Jobs providers", to: "/docs/integrations/jobs" },
      { label: "Rate limiting", to: "/docs/integrations/rate-limiting" },
      { label: "Audit log", to: "/docs/integrations/audit-log" },
      { label: "Uploads (UploadThing)", to: "/docs/integrations/uploads" },
      { label: "OAuth providers", to: "/docs/integrations/oauth" },
    ],
  },
  {
    kicker: "06 · Deploy",
    entries: [
      { label: "Deploy the api", to: "/docs/deploy/api" },
      { label: "Deploy the web shells", to: "/docs/deploy/web" },
      { label: "Postgres providers", to: "/docs/deploy/postgres" },
      { label: "Production webhook routing", to: "/docs/deploy/webhooks" },
      { label: "Secrets & rotation", to: "/docs/deploy/secrets" },
    ],
  },
];

const FLAT_WRITTEN: { label: string; to: string }[] = DOCS_NAV.flatMap((g) =>
  g.entries
    .filter((e): e is { label: string; to: string } => typeof e.to === "string")
    .map((e) => ({ label: e.label, to: e.to })),
);

interface DocsLayoutProps {
  kicker: string;
  title: string;
  description?: string;
  path: string;
  children: ReactNode;
}

export function DocsLayout({
  kicker,
  title,
  description,
  path,
  children,
}: DocsLayoutProps) {
  const idx = FLAT_WRITTEN.findIndex((e) => e.to === path);
  const prev = idx > 0 ? FLAT_WRITTEN[idx - 1] : null;
  const next =
    idx >= 0 && idx < FLAT_WRITTEN.length - 1 ? FLAT_WRITTEN[idx + 1] : null;

  return (
    <OrmProvider>
    <div className="relative min-h-svh bg-background font-mono text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <AmbientGrain />
      </div>
      <SiteHeader active="/docs" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-6 pb-10 md:px-12 md:pt-10 md:pb-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr] md:gap-16 md:items-start">
          <aside className="md:sticky md:top-6 md:max-h-[calc(100svh-3rem)] md:self-start md:overflow-y-auto md:pr-2">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-[0.25em] transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
              Docs home
            </Link>
            <nav className="mt-8 space-y-8">
              {DOCS_NAV.map((group) => (
                <div key={group.kicker}>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                    {group.kicker}
                  </div>
                  <ul className="mt-3 space-y-0.5 text-sm">
                    {group.entries.map((entry) => (
                      <li key={entry.label}>
                        {entry.to ? (
                          <Link
                            to={entry.to}
                            className={
                              entry.to === path
                                ? "-mx-2 block rounded px-2 py-1.5 bg-accent/40 text-foreground"
                                : "-mx-2 block rounded px-2 py-1.5 text-foreground/70 transition-colors hover:bg-accent/20 hover:text-foreground"
                            }
                          >
                            {entry.label}
                          </Link>
                        ) : (
                          <div className="-mx-2 flex items-center gap-2 px-2 py-1.5 text-muted-foreground/60">
                            <span>{entry.label}</span>
                            <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40">
                              soon
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
              {kicker}
            </div>
            <h1 className="mt-4 font-medium text-3xl leading-[1.1] tracking-tight md:text-[42px]">
              {title}
            </h1>
            {description && (
              <p className="mt-5 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
                {description}
              </p>
            )}

            <div className="mt-10">{children}</div>

            {(prev || next) && (
              <div className="mt-16 grid grid-cols-1 gap-4 border-t border-border/60 pt-8 sm:grid-cols-2">
                {prev ? (
                  <Link
                    to={prev.to}
                    className="group flex flex-col gap-1 rounded-xl border border-border/60 bg-card/20 p-4 not-dark:bg-clip-padding transition-colors hover:bg-card/40"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                      Previous
                    </span>
                    <span className="flex items-center gap-2 text-foreground/90 text-sm group-hover:text-foreground">
                      <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
                      {prev.label}
                    </span>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
                {next ? (
                  <Link
                    to={next.to}
                    className="group flex flex-col items-end gap-1 rounded-xl border border-border/60 bg-card/20 p-4 not-dark:bg-clip-padding transition-colors hover:bg-card/40"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                      Next
                    </span>
                    <span className="flex items-center gap-2 text-foreground/90 text-sm group-hover:text-foreground">
                      {next.label}
                      <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                    </span>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
    </OrmProvider>
  );
}

export function DocsH2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mt-14 scroll-mt-24 font-medium text-foreground text-xl tracking-tight first:mt-0 md:text-2xl"
    >
      {children}
    </h2>
  );
}

export function DocsH3({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className="mt-10 scroll-mt-24 font-medium text-foreground text-base tracking-tight md:text-lg"
    >
      {children}
    </h3>
  );
}

export function DocsP({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-muted-foreground text-sm leading-relaxed md:text-[15px]">
      {children}
    </p>
  );
}

export function DocsCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-accent/40 px-1.5 py-0.5 font-mono text-[0.88em] text-foreground/90">
      {children}
    </code>
  );
}

export function DocsCodeBlock({
  children,
  caption,
  lang = "tsx",
}: {
  children: string;
  caption?: string;
  lang?: Language;
}) {
  const code = children.replace(/\n+$/, "");
  return (
    <div className="mt-5">
      {caption && (
        <div className="mb-2 text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          {caption}
        </div>
      )}
      <Highlight theme={themes.vsDark} code={code} language={lang}>
        {({ className, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} overflow-x-auto rounded-lg border border-border/60 bg-zinc-950 p-4 text-[13px] leading-relaxed`}
          >
            <code className="font-mono">
              {tokens.map((line, i) => {
                const { key: _lk, ...lineProps } = getLineProps({ line });
                return (
                  <div key={i} {...lineProps}>
                    {line.map((token, j) => {
                      const { key: _tk, ...tokenProps } = getTokenProps({
                        token,
                      });
                      return <span key={j} {...tokenProps} />;
                    })}
                  </div>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export function DocsCallout({
  kind = "note",
  children,
}: {
  kind?: "note" | "warn";
  children: ReactNode;
}) {
  return (
    <div
      className={
        kind === "warn"
          ? "mt-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
          : "mt-5 rounded-lg border border-border/60 bg-card/20 p-4 not-dark:bg-clip-padding"
      }
    >
      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
        {kind === "warn" ? "Heads up" : "Note"}
      </div>
      <div className="mt-2 text-foreground/90 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function DocsList({
  children,
  ordered,
}: {
  children: ReactNode;
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={
        ordered
          ? "mt-4 list-decimal space-y-2 pl-5 text-muted-foreground text-sm leading-relaxed marker:text-foreground/40 md:text-[15px]"
          : "mt-4 list-disc space-y-2 pl-5 text-muted-foreground text-sm leading-relaxed marker:text-foreground/40 md:text-[15px]"
      }
    >
      {children}
    </Tag>
  );
}

export function DocsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-border/60 not-dark:bg-clip-padding">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-card/20">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="border-border/60 border-b px-4 py-3 text-left text-[10px] text-muted-foreground uppercase tracking-[0.25em]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-border/50 border-b last:border-b-0 [&>td]:align-top"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-foreground/90">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
