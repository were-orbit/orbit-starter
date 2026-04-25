import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  PlayIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@orbit/ui/alert";
import { Badge } from "@orbit/ui/badge";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { toastManager } from "@orbit/ui/toast";
// +feature:auth-admin
import type { AuditEntryDTO } from "@orbit/shared/dto";
// -feature:auth-admin
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { memberDisplayName, useWorkspace, type Member } from "@/lib/workspace";
// +feature:realtime
import { useRealtimeClient } from "@/lib/db/provider";
// -feature:realtime
import { useWorkspaceSlug } from "@/lib/use-workspace-slug";

export function DevPage() {
  const workspaceSlug = useWorkspaceSlug();
  // +feature:realtime
  const realtime = useRealtimeClient();
  // -feature:realtime

  if (!workspaceSlug) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 md:px-6">
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Dev-only feature inventory — delete before shipping</AlertTitle>
          <AlertDescription>
            This page is for verifying which opt-in features are wired into the
            current build. Remove{" "}
            <code>apps/web-tanstack/src/pages/dev-page.tsx</code> and its route
            file before going to production.
          </AlertDescription>
        </Alert>

        <ActiveProvidersPanel />

        {/* +feature:auth-magic-link */}
        <MagicLinkPanel />
        {/* -feature:auth-magic-link */}

        <SeedActionsPanel slug={workspaceSlug} />


        <div>
          <h2 className="font-semibold text-lg">Feature inventory</h2>
          <p className="mt-1 max-w-prose text-[13px] text-muted-foreground">
            Each card maps to a feature in <code>features.json</code>. Cards
            disappear when the matching feature is stripped by the generator
            CLI.
          </p>
        </div>

        <div className="space-y-3">


          {/* +feature:realtime */}
          <FeatureCard
            name="realtime"
            label="Realtime (WebSocket + presence)"
            description="useRealtimeClient() returns a live client when the workspace WS is connected."
            extraStatus={
              realtime ? (
                <Badge variant="success">connected</Badge>
              ) : (
                <Badge variant="warning">disconnected</Badge>
              )
            }
          />
          {/* -feature:realtime */}

          {/* +feature:auth-admin */}
          <AuthAdminCard />
          {/* -feature:auth-admin */}

          {/* +feature:auth-oauth */}
          <FeatureCard
            name="auth-oauth"
            label="OAuth providers (Google + Apple)"
            description="Social sign-in is exposed on the login screen via better-auth socialProviders."
          >
            <Button
              variant="outline"
              size="sm"
              render={<a href="/login" target="_blank" rel="noreferrer" />}
            >
              <ExternalLinkIcon />
              Open /login
            </Button>
          </FeatureCard>
          {/* -feature:auth-oauth */}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Active providers — at-a-glance view of which adapters are wired in
// ───────────────────────────────────────────────────────────────────────────
function ActiveProvidersPanel() {
  const query = useQuery({
    queryKey: ["dev", "active-providers"],
    queryFn: () => api.dev.getActiveProviders(),
    staleTime: 60_000,
  });
  const data = query.data;

  return (
    <Section
      title="Active providers"
      subtitle="What's actually wired into the running container — not just what's in features.json."
    >
      {!data ? (
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-[max-content_1fr]">
          <ProviderRow label="NODE_ENV" value={data.nodeEnv} />
          <ProviderRow label="Mailer" value={data.mailer} />
        </dl>
      )}
    </Section>
  );
}

function ProviderRow({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "muted";
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 font-mono text-[12.5px]">
        <span
          className={
            tone === "warn"
              ? "text-amber-500"
              : tone === "muted"
                ? "text-muted-foreground"
                : "text-foreground"
          }
        >
          {value}
        </span>
      </dd>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Magic link fetcher
// ───────────────────────────────────────────────────────────────────────────
// +feature:auth-magic-link
function MagicLinkPanel() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fetchMutation = useMutation({
    mutationFn: (e: string) => api.dev.getLastMagicLink(e),
    onSuccess: (res) => setLink(res.link),
  });

  const onCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Section
      title="Last magic link"
      subtitle="Pulls the most recent magic link for the given email from the dev mailer cache."
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) fetchMutation.mutate(email.trim().toLowerCase());
        }}
      >
        <Input
          type="email"
          value={email}
          placeholder="user@example.com"
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={!email.trim() || fetchMutation.isPending}
          loading={fetchMutation.isPending}
        >
          Fetch
        </Button>
      </form>
      {fetchMutation.isSuccess ? (
        link ? (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2">
            <code className="flex-1 truncate text-[12px]">{link}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              aria-label="Copy magic link"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<a href={link} target="_blank" rel="noreferrer" />}
            >
              Open
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-muted-foreground">
            No magic link cached for that email. Trigger one from the login
            page first.
          </p>
        )
      ) : null}
    </Section>
  );
}
// -feature:auth-magic-link

// ───────────────────────────────────────────────────────────────────────────
// Seed actions
// ───────────────────────────────────────────────────────────────────────────
function SeedActionsPanel({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const seedMembers = useMutation({
    mutationFn: (count: number) => api.dev.seedMembers(slug, count),
    onSuccess: (res) => {
      toastManager.add({
        type: "success",
        title: `Added ${res.created.length} member${res.created.length === 1 ? "" : "s"}`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceSnapshot(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(slug) });
    },
    onError: (err) =>
      toastManager.add({
        type: "danger",
        title: "Failed to seed members",
        description: err instanceof Error ? err.message : "unknown error",
      }),
  });

  return (
    <Section
      title="Seed data"
      subtitle="Drop fake users / teams into the current workspace. Useful for stress-testing layouts and demoing populated states."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => seedMembers.mutate(5)}
          disabled={seedMembers.isPending}
          loading={seedMembers.isPending}
        >
          <UsersIcon />
          Add 5 members
        </Button>
      </div>
    </Section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Run a job ad-hoc
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// Recent audit entries
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// Existing AuthAdminCard
// ───────────────────────────────────────────────────────────────────────────
// +feature:auth-admin
function AuthAdminCard() {
  const [lastResult, setLastResult] = useState<
    { role: string } | { error: string } | null
  >(null);

  const promote = useMutation({
    mutationFn: () => api.dev.makeMeAdmin(),
    onSuccess: (data) => setLastResult({ role: data.role }),
    onError: (err) =>
      setLastResult({ error: err instanceof Error ? err.message : "failed" }),
  });

  return (
    <FeatureCard
      name="auth-admin"
      label="App-level admin (better-auth admin plugin)"
      description="Adds app-wide role/banned fields on users. The dev endpoint below self-promotes the current session to role=admin so you can exercise the admin endpoints (listUsers, setRole, banUser, impersonate)."
      extraStatus={
        lastResult && "role" in lastResult ? (
          <Badge variant="success">role={lastResult.role}</Badge>
        ) : null
      }
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => promote.mutate()}
        disabled={promote.isPending}
        loading={promote.isPending}
      >
        Promote me to app admin
      </Button>
      {lastResult && "error" in lastResult ? (
        <span className="text-[12px] text-destructive">
          {lastResult.error}
        </span>
      ) : null}
    </FeatureCard>
  );
}
// -feature:auth-admin

// ───────────────────────────────────────────────────────────────────────────
// Layout primitives
// ───────────────────────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground [text-wrap:pretty]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FeatureCard({
  name,
  label,
  description,
  extraStatus,
  children,
}: {
  name: string;
  label: string;
  description: ReactNode;
  extraStatus?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold text-sm">{label}</h3>
            <code className="text-[11px] text-muted-foreground">{name}</code>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground [text-wrap:pretty]">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {extraStatus}
          <Badge variant="success">enabled</Badge>
        </div>
      </div>
      {children ? (
        <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      ) : null}
    </div>
  );
}
