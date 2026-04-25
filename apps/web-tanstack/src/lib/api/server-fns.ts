/**
 * TanStack Start server functions for auth-sensitive data fetching.
 *
 * Why this file exists: in a split web / api architecture the auth cookie
 * lives on the api origin. During SSR the Node runtime has no browser cookie
 * jar, so a naive `fetch(..., { credentials: "include" })` from the web
 * server can't forward the user's session — every SSR hit to `/v1/me` and
 * `/v1/workspaces/:slug` would come back 401 and boot signed-in users to
 * `/login` on refresh.
 *
 * The better-auth + TanStack Start recommended fix is `createServerFn` +
 * `getRequestHeader(s)`: the server fn runs server-side with the incoming
 * request available, so we can read the `cookie` header and forward it to
 * the remote api. The caller (TanStack Query / `beforeLoad`) invokes it
 * directly during SSR and transparently RPCs on the client — but we still
 * prefer the direct `api.*` path on the client (see
 * `lib/queries/session.ts` and `lib/db/hydrate.ts`) to avoid an extra hop.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { MeResponse, WorkspaceSnapshot } from "@/lib/api/client";
import { request } from "@/lib/api/client";

function forwardedCookieHeaders(): Record<string, string> {
  const cookie = getRequestHeader("cookie");
  return cookie ? { cookie } : {};
}

export const getMeOnServer = createServerFn({ method: "GET" }).handler(
  (): Promise<MeResponse> =>
    request<MeResponse>("/v1/me", { headers: forwardedCookieHeaders() }),
);

export const getWorkspaceSnapshotOnServer = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(
    ({ data }): Promise<WorkspaceSnapshot> =>
      request<WorkspaceSnapshot>(`/v1/workspaces/${data}`, {
        headers: forwardedCookieHeaders(),
      }),
  );
