import { Hono } from "hono";
import { me } from "./controllers/auth.controller.ts";
import { mePreferences } from "./controllers/me.preferences.controller.ts";
import { meAccount } from "./controllers/me.account.controller.ts";
import { config } from "./controllers/config.controller.ts";
import { dev } from "./controllers/dev.controller.ts";
import { invites } from "./controllers/invites.controller.ts";
import { workspaces } from "./controllers/workspaces.controller.ts";
import type { HonoEnv } from "./middleware/container.ts";

export function buildRouter(): Hono<HonoEnv> {
  const v1 = new Hono<HonoEnv>();
  v1.route("/config", config);
  v1.route("/dev", dev);
  v1.route("/me", me);
  v1.route("/me/preferences", mePreferences);
  v1.route("/me", meAccount);
  v1.route("/invites", invites);
  v1.route("/workspaces", workspaces);
  return v1;
}
