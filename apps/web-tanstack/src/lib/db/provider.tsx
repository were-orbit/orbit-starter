// +feature:realtime
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
// -feature:realtime
import { ApiError } from "@/lib/api/client";
import { queryClient } from "@/lib/query-client";
import { meQueryOptions } from "@/lib/queries/session";
import { updateAppState } from "@/lib/stores/app-state";
// +feature:realtime
import { useAppState } from "@/lib/stores/app-state";
// -feature:realtime
import { clearClientSessionCaches } from "@/lib/workspace";
import { hydrateWorkspace } from "./hydrate";
// +feature:realtime
import { connectRealtime, type RealtimeClient } from "./realtime";

interface RealtimeContextValue {
  client: RealtimeClient | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({ client: null });

export function useRealtimeClient(): RealtimeClient | null {
  return useContext(RealtimeContext).client;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  if (typeof window === "undefined") {
    return <RealtimeContext.Provider value={{ client: null }}>{children}</RealtimeContext.Provider>;
  }
  return <ClientRealtimeProvider>{children}</ClientRealtimeProvider>;
}

function ClientRealtimeProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<RealtimeClient | null>(null);
  const { currentWorkspace } = useAppState();
  const slug = currentWorkspace?.slug ?? null;

  useEffect(() => {
    if (!slug) {
      setClient((prev) => {
        prev?.close();
        return null;
      });
      return;
    }
    const rt = connectRealtime(slug);
    setClient((prev) => {
      prev?.close();
      return rt;
    });
    return () => {
      rt.close();
    };
  }, [slug]);

  return <RealtimeContext.Provider value={{ client }}>{children}</RealtimeContext.Provider>;
}
// -feature:realtime

export type BootstrapSessionResult = "workspace" | "empty" | "unauthenticated";

export async function bootstrapSession(): Promise<BootstrapSessionResult> {
  try {
    // Drop any in-memory workspace data and `/v1/me` cache from a prior user.
    // `meQueryOptions` uses a 60s staleTime; without this, `fetchQuery` can
    // return the previous account right after magic-link sign-in.
    clearClientSessionCaches();
    const me = await queryClient.fetchQuery(meQueryOptions);
    updateAppState((draft) => {
      draft.currentUser = me.user;
    });
    if (me.workspaces.length > 0) {
      const first = me.workspaces[0];
      await hydrateWorkspace(first.slug);
      return "workspace";
    }
    return "empty";
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return "unauthenticated";
    }
    throw err;
  }
}
