import { Hono } from "hono";
import { requireSession } from "../middleware/session.ts";
import type { HonoEnv } from "../middleware/container.ts";
import type { UserId } from "@/identity/domain/user.ts";

export const meAccount = new Hono<HonoEnv>();

meAccount.get("/owned-workspaces-blocking-delete", async (c) => {
  const container = c.get("container");
  const session = requireSession(c);
  const result = await container.services.listBlockingOwnedWorkspaces.execute(
    session.userId as UserId,
  );
  c.get("log")?.set({
    action: "me.ownedWorkspacesBlockingDelete",
    count: result.workspaces.length,
  });
  return c.json(result);
});
