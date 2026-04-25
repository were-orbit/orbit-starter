// +feature:auth-admin
"use client";

import { useState } from "react";
import { ShieldAlertIcon, XIcon } from "lucide-react";
import { Button } from "@orbit/ui/button";
import { authClient } from "@/lib/auth-client";
import { useImpersonatedBy } from "@/lib/hooks/use-is-app-admin";

export function ImpersonationBanner(): React.ReactElement | null {
  const impersonatedBy = useImpersonatedBy();
  const [busy, setBusy] = useState(false);

  if (!impersonatedBy) return null;

  async function stop() {
    setBusy(true);
    try {
      await authClient.admin.stopImpersonating();
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500/95 px-3 py-1.5 text-[12px] font-medium text-amber-950 shadow-sm"
    >
      <ShieldAlertIcon className="size-4 shrink-0" />
      <span>
        You are impersonating another user. Admin actions are audited.
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 gap-1 px-2 text-amber-950 hover:bg-amber-600/30"
        disabled={busy}
        onClick={stop}
      >
        <XIcon className="size-3.5" />
        {busy ? "Stopping…" : "Stop impersonating"}
      </Button>
    </div>
  );
}
// -feature:auth-admin
