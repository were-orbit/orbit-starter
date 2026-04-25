import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@orbit/ui/alert-dialog";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import { toastManager } from "@orbit/ui/toast";
import { authClient } from "@/lib/auth-client";
import { useMeUser } from "@/lib/use-me-user";
import { blockingOwnedWorkspacesQueryOptions } from "@/lib/queries/account";
import { SettingsSection } from "@/pages/workspace-settings/shared";

export function DangerZoneSection(): React.ReactElement | null {
  const me = useMeUser();
  const { data, isLoading } = useQuery(blockingOwnedWorkspacesQueryOptions);
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  if (!me) return null;
  const blocking = data?.workspaces ?? [];
  const blocked = blocking.length > 0;

  async function confirmDelete() {
    setStatus("sending");
    const res = await authClient.deleteUser({
      callbackURL: "/?accountDeleted=1",
    });
    if (res.error) {
      toastManager.add({
        type: "error",
        title: "Could not send deletion link",
        description: res.error.message,
        timeout: 5000,
      });
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  return (
    <SettingsSection
      title="Danger zone"
      description="Permanently delete your account and all associated data."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Checking workspace ownership...</p>
      ) : blocked ? (
        <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium">
            You own {blocking.length} workspace{blocking.length === 1 ? "" : "s"} and
            must transfer or delete {blocking.length === 1 ? "it" : "them"} first:
          </p>
          <ul className="list-disc pl-5">
            {blocking.map((ws) => (
              <li key={ws.id}>
                <Link
                  className="underline"
                  to="/d/$workspaceSlug"
                  params={{ workspaceSlug: ws.slug }}
                >
                  {ws.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <Button
          variant="destructive"
          disabled={blocked || isLoading}
          onClick={() => setOpen(true)}
        >
          Delete account
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes your account, your workspace memberships, and any
              workspace where you are the only member. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {status === "sent" ? (
            <p className="text-sm">
              We sent a confirmation link to <strong>{me.email}</strong>. Click it
              to finish deleting your account.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              <Label htmlFor="confirm-email">
                Type your email to confirm: <span className="font-mono">{me.email}</span>
              </Label>
              <Input
                id="confirm-email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          )}
          <AlertDialogFooter>
            {status === "sent" ? (
              <Button render={<AlertDialogClose />} onClick={() => setOpen(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button variant="outline" render={<AlertDialogClose />}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmEmail.trim() !== me.email || status === "sending"}
                  onClick={confirmDelete}
                >
                  {status === "sending" ? "Sending..." : "Send deletion link"}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </SettingsSection>
  );
}
