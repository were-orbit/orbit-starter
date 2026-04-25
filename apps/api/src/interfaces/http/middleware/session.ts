import type { Context, MiddlewareHandler } from "hono";
import { ForbiddenError, UnauthorizedError } from "@/kernel/errors.ts";
import type { WorkspacePermission } from "@orbit/shared/permissions";
import type { WorkspaceMember } from "@/workspaces/domain/workspace-member.ts";
// +feature:auth-admin
import { readAppAdminRow } from "@/infrastructure/better-auth-user.ts";
// -feature:auth-admin
import type { HonoEnv } from "./container.ts";

export const session = (): MiddlewareHandler<HonoEnv> => async (c, next) => {
  const container = c.get("container");
  const result = await container.auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (result?.user?.id) {
    c.set("session", { userId: result.user.id });
    // Attach identity to the request's wide event so log aggregators can
    // slice by user without us sprinkling user.id across every handler.
    // `log.set` deep-merges, so controllers that later call
    // `log.set({ user: { name, plan } })` compose cleanly on top.
    c.get("log")?.set({
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    });
  }
  await next();
};

export function requireSession(c: Context<HonoEnv>): { userId: string } {
  const s = c.get("session");
  if (!s) throw new UnauthorizedError();
  return s;
}

/**
 * Authorization gate on a fully-hydrated `WorkspaceMember`. Throws a
 * 403 with a stable `permission.denied` error code so the web client
 * can render the same disabled-state message regardless of which
 * permission was missing. Use this in controllers after the member is
 * resolved; services should treat permission as a pre-established
 * invariant and not re-check.
 */
export function requirePermission(
  me: WorkspaceMember,
  permission: WorkspacePermission,
): void {
  if (!me.hasPermission(permission)) {
    throw new ForbiddenError("permission.denied");
  }
}

// +feature:auth-admin
/**
 * App-level admin gate. Rejects banned users even if their role is
 * still `admin`, so a ban is effective the instant it's written.
 */
export async function requireAppAdmin(
  c: Context<HonoEnv>,
): Promise<{ userId: string }> {
  const session = requireSession(c);
  const container = c.get("container");
  const row = await readAppAdminRow(container, session.userId);
  if (!row || row.banned || row.role !== "admin") {
    throw new ForbiddenError("permission.denied");
  }
  return session;
}
// -feature:auth-admin
