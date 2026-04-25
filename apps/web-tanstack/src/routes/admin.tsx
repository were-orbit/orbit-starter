// +feature:auth-admin
import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { ApiError } from "@/lib/api/client";
import { meQueryOptions } from "@/lib/queries/session";
import { AdminPage } from "@/views/admin/admin-page";
import { clearClientSessionCaches } from "@/lib/workspace";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    let me;
    try {
      me = await context.queryClient.ensureQueryData(meQueryOptions);
    } catch (err) {
      if (isRedirect(err)) throw err;
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403 || err.status === 404)
      ) {
        clearClientSessionCaches();
        throw redirect({ to: "/login" });
      }
      throw err;
    }
    if (me.user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminRoute,
});

function AdminRoute() {
  return <AdminPage />;
}
// -feature:auth-admin
