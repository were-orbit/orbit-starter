import { Hono } from "hono";
import { requireSession } from "../middleware/session.ts";
import type { HonoEnv } from "../middleware/container.ts";
import { userToDTO } from "@/interfaces/mappers.ts";
// +feature:auth-admin
import { readAppAdminRow } from "@/infrastructure/better-auth-user.ts";
// -feature:auth-admin

export const me = new Hono<HonoEnv>();

me.get("/", async (c) => {
  const container = c.get("container");
  const session = requireSession(c);
  const { user, workspaces } = await container.services.getMe.resolveByUserId(session.userId as never);
  c.get("log")?.set({ action: "me.resolve", result: { workspaceCount: workspaces.length } });

  // +feature:auth-admin
  const adminRow = await readAppAdminRow(container, session.userId);
  const authSession = await container.auth.api.getSession({
    headers: c.req.raw.headers,
  });
  const impersonatedBy = authSession?.session?.impersonatedBy ?? null;
  // -feature:auth-admin

  return c.json({
    user: {
      ...userToDTO(user),
      // +feature:auth-admin
      role: adminRow?.banned
        ? null
        : adminRow?.role === "admin"
          ? "admin"
          : adminRow?.role === "user"
            ? "user"
            : null,
      impersonatedBy,
      // -feature:auth-admin
    },
    workspaces: workspaces.map((w) => ({
      id: w.workspaceId,
      memberId: w.id,
      slug: w.slug,
      name: w.name,
      // Workspace picker on the web app just needs a human-friendly
      // label for each membership — not the full role DTO. We send
      // `roleSystemKey` too so the picker can badge OWNERs distinctly
      // (the only role-based UI outside the current workspace).
      roleName: w.roleName,
      roleSystemKey: w.roleSystemKey,
    })),
  });
});
