import { useState } from "react";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import { toastManager } from "@orbit/ui/toast";
import { authClient } from "@/lib/auth-client";
import { useMeUser } from "@/lib/use-me-user";
import { SettingsSection } from "@/pages/workspace-settings/shared";

export function EmailSection(): React.ReactElement | null {
  const me = useMeUser();
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!me) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const trimmed = newEmail.trim();
    if (!trimmed || trimmed === me.email) return;
    setStatus("sending");
    const res = await authClient.changeEmail({
      newEmail: trimmed,
      callbackURL: "/account?emailChanged=1",
    });
    if (res.error) {
      toastManager.add({
        type: "error",
        title: "Could not send verification",
        description: res.error.message,
        timeout: 5000,
      });
      setStatus("idle");
      return;
    }
    setSentTo(trimmed);
    setStatus("sent");
  }

  return (
    <SettingsSection
      title="Email"
      description={`Current email: ${me.email}`}
    >
      {status === "sent" && sentTo ? (
        <p className="text-sm">
          Check your inbox at <strong>{sentTo}</strong> to confirm the change.
        </p>
      ) : (
        <form onSubmit={submit} className="max-w-sm space-y-3">
          <Label htmlFor="new-email">New email</Label>
          <Input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@newdomain.com"
            required
          />
          <Button type="submit" disabled={status === "sending" || !newEmail.trim()}>
            {status === "sending" ? "Sending..." : "Send verification link"}
          </Button>
        </form>
      )}
    </SettingsSection>
  );
}
