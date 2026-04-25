import { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../middleware/session.ts";
import { ValidationError } from "@/kernel/errors.ts";
import {
  ORBIT_THEME_MODES,
  ORBIT_THEME_PALETTES,
} from "@orbit/shared/themes";
import type { HonoEnv } from "../middleware/container.ts";
import type { UserId } from "@/identity/domain/user.ts";

const BodySchema = z.object({
  themeMode: z.enum([...ORBIT_THEME_MODES]).nullable().optional(),
  themePalette: z.enum([...ORBIT_THEME_PALETTES]).nullable().optional(),
});

export const mePreferences = new Hono<HonoEnv>();

mePreferences.patch("/", async (c) => {
  const container = c.get("container");
  const session = requireSession(c);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError(
      "validation",
      "body must be valid JSON",
    );
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "validation",
      parsed.error.issues[0]?.message ?? "invalid body",
    );
  }

  await container.services.updatePreferences.execute({
    userId: session.userId as UserId,
    ...parsed.data,
  });

  // Read back the authoritative stored values so the client can
  // reconcile its local cache without a second round-trip.
  const { user } = await container.services.getMe.resolveByUserId(
    session.userId as UserId,
  );

  c.get("log")?.set({
    action: "me.updatePreferences",
    themeMode: user.themeMode,
    themePalette: user.themePalette,
  });

  return c.json({
    themeMode: user.themeMode,
    themePalette: user.themePalette,
  });
});
