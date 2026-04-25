import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useBootstrapSessionMutation } from "@/lib/mutations";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { mutate, isPending, isError } = useBootstrapSessionMutation();

  useEffect(() => {
    let active = true;
    mutate(undefined, {
      onSuccess: (result) => {
        if (!active) return;
        if (result === "workspace") {
          // Let `/` pick the right workspace slug (preferred-or-first)
          // and redirect into `/d/$workspaceSlug`. Keeps the slug
          // resolution in one place.
          navigate({ to: "/" });
          return;
        }
        if (result === "empty") {
          navigate({ to: "/onboarding" });
          return;
        }
        navigate({ to: "/login" });
      },
    });
    return () => {
      active = false;
    };
  }, [mutate, navigate]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground text-sm">
      <p>{isPending ? "Finalizing sign-in…" : "Sign-in finished."}</p>
      {isError ? (
        <p className="max-w-sm text-destructive text-xs">
          Something went wrong while completing sign-in. You can close this tab and try again from
          your email link.
        </p>
      ) : null}
    </div>
  );
}
