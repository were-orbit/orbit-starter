import { useEffect, useState } from "react";
import { Button } from "@orbit/ui/button";
import { Skeleton } from "@orbit/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { SettingsSection } from "@/pages/workspace-settings/shared";

interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function formatAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Browser";
}

export function SessionsSection(): React.ReactElement {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const [list, session] = await Promise.all([
      authClient.listSessions(),
      authClient.getSession(),
    ]);
    setSessions((list.data ?? []) as unknown as SessionRow[]);
    const sessData = session.data as { session?: { token?: string } } | null;
    setCurrentToken(sessData?.session?.token ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function revoke(token: string) {
    setBusy(token);
    await authClient.revokeSession({ token });
    await refresh();
    setBusy(null);
  }

  async function revokeOthers() {
    setBusy("__others__");
    await authClient.revokeOtherSessions();
    await refresh();
    setBusy(null);
  }

  return (
    <SettingsSection
      title="Active sessions"
      description="Devices currently signed in to your account."
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active sessions.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {sessions.map((s) => {
            const isCurrent = s.token === currentToken;
            return (
              <li key={s.id} className="flex items-center justify-between p-3">
                <div className="space-y-0.5 text-sm">
                  <div className="font-medium">
                    {formatAgent(s.userAgent)}
                    {isCurrent ? (
                      <span className="ml-1 text-xs text-primary">(current)</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.ipAddress ?? "IP unknown"} - last active{" "}
                    {new Date(s.updatedAt).toLocaleString()}
                  </div>
                </div>
                {!isCurrent ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === s.token}
                    onClick={() => revoke(s.token)}
                  >
                    {busy === s.token ? "Signing out..." : "Sign out"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {sessions && sessions.length > 1 ? (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={busy === "__others__"}
            onClick={revokeOthers}
          >
            {busy === "__others__" ? "Signing out..." : "Sign out of all other sessions"}
          </Button>
        </div>
      ) : null}
    </SettingsSection>
  );
}
