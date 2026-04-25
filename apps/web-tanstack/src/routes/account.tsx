import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { AccountPage } from "@/views/account/account-page";

export const Route = createFileRoute("/account")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AccountRoute,
});

function AccountRoute() {
  const backHref = useMemo(() => {
    if (typeof window === "undefined") return "/";
    const last = window.localStorage.getItem("orbit:lastWorkspaceSlug");
    return last ? `/d/${last}` : "/";
  }, []);
  return <AccountPage backHref={backHref} />;
}
