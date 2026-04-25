import {
  createFileRoute,
  isRedirect,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef } from "react";
import { AppLayout } from "@/components/app-layout";
import { AppShellSkeleton } from "@/components/app-shell-skeleton";
import type { MeResponse, WorkspaceSnapshot } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import {
  applyWorkspaceSnapshot,
  clearStaleWorkspaceEntities,
  getWorkspaceSnapshotForSlug,
  peekWorkspaceSnapshotForSlug,
  workspaceSnapshotQueryOptions,
} from "@/lib/db/hydrate";
import { queryClient } from "@/lib/query-client";
import { meQueryOptions } from "@/lib/queries/session";
import { updateAppState } from "@/lib/stores/app-state";
import {
  clearClientSessionCaches,
  resetWorkspace,
  setPreferredWorkspaceSlug,
  useWorkspace,
} from "@/lib/workspace";

/** Authenticated shell for `/d/:workspaceSlug/*`. Snapshot in `beforeLoad`; stores hydrate in layout below (`ssr: "data-only"` — no RSC shell). */
export const Route = createFileRoute("/d/$workspaceSlug")({
  ssr: "data-only",
  pendingMs: 200,
  pendingMinMs: 400,
  pendingComponent: AppShellSkeleton,
  beforeLoad: async ({ context, params }) => {
    let me: MeResponse;
    try {
      me = await context.queryClient.ensureQueryData(meQueryOptions);
    } catch (err) {
      if (isRedirect(err)) throw err;
      if (err instanceof ApiError && err.status === 401) {
        clearClientSessionCaches();
        throw redirect({ to: "/login" });
      }
      throw err;
    }
    if (me.workspaces.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    const membership = me.workspaces.find((w) => w.slug === params.workspaceSlug);
    if (!membership) {
      throw redirect({ to: "/", replace: true });
    }
    const snapshot: WorkspaceSnapshot = await context.queryClient.ensureQueryData(
      workspaceSnapshotQueryOptions(params.workspaceSlug),
    );
    return { me, slug: params.workspaceSlug, snapshot };
  },
  component: AppShellLayout,
});

function AppShellLayout() {
  const { me, slug, snapshot } = Route.useRouteContext();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const previousSlugRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (previousSlugRef.current && previousSlugRef.current !== slug) {
      clearStaleWorkspaceEntities();
    }
    previousSlugRef.current = slug;
    setPreferredWorkspaceSlug(slug);
    updateAppState((draft) => {
      draft.currentUser = me.user;
    });

    const fromRouter = snapshot.workspace.slug === slug ? snapshot : null;
    const resolved = fromRouter ?? peekWorkspaceSnapshotForSlug(slug, queryClient);
    if (resolved) {
      void applyWorkspaceSnapshot(resolved);
    } else {
      void getWorkspaceSnapshotForSlug(slug, queryClient).then((snap) =>
        applyWorkspaceSnapshot(snap),
      );
    }
  }, [slug, me, snapshot]);


  if (!ws) return <AppShellSkeleton />;

  const onReset = async () => {
    const ok = window.confirm("Sign out of this workspace?");
    if (!ok) return;
    await resetWorkspace();
    navigate({ to: "/onboarding" });
  };

  return (
    <AppLayout ws={ws} onReset={onReset}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </AppLayout>
  );
}
