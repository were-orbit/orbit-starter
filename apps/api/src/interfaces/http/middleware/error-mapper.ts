import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { DomainError } from "@/kernel/errors.ts";
import type { HonoEnv } from "./container.ts";

export const errorMapper: ErrorHandler<HonoEnv> = (err, c) => {
  const log = c.get("log");

  if (err instanceof DomainError) {
    // Domain errors are expected flow-control (e.g. NotFound, Forbidden).
    // We still want them on the wide event for aggregation, but at `warn`
    // severity rather than `error` so production dashboards don't page on
    // user-facing 404/409s.
    log?.set({
      error: { kind: "domain", code: err.code, status: err.status, message: err.message },
    });
    log?.warn(err.message);
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  if (err instanceof ZodError) {
    log?.set({
      error: {
        kind: "validation",
        status: 400,
        issueCount: err.issues.length,
        // First issue path is usually enough to spot the culprit field
        // without dumping the full shape of every request body.
        firstIssuePath: err.issues[0]?.path.join("."),
      },
    });
    log?.warn("validation failed");
    return c.json(
      { error: { code: "validation", message: "invalid request", issues: err.issues } },
      400,
    );
  }

  // Anything else is an unexpected crash — capture the full error (stack,
  // name, message) so we can triage.
  log?.error(err instanceof Error ? err : new Error(String(err)), {
    error: { kind: "internal", status: 500 },
  });
  return c.json({ error: { code: "internal", message: "internal error" } }, 500);
};
