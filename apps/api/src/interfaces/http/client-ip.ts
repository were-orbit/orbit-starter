import type { Context } from "hono";
import type { HonoEnv } from "./middleware/container.ts";

// TODO(ops): header trust chain isn't per-deploy configurable. On
// deploys where the client can inject these headers before they
// reach a trusted edge, the limiter is bypassable.
export function getClientIp(c: Context<HonoEnv>): string {
  const fly = c.req.header("fly-client-ip");
  if (fly) return fly.trim();
  const cf = c.req.header("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = c.req.header("x-real-ip");
  if (real) return real.trim();
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
