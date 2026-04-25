import type { MiddlewareHandler } from "hono";
import type { RequestLogger } from "evlog";
import type { AppContainer } from "@/composition.ts";

export type HonoEnv = {
  Variables: {
    container: AppContainer;
    session?: {
      userId: string;
    };
    /**
     * Request-scoped wide event logger, installed by the evlog middleware in
     * app.ts. One wide event is emitted per request with all accumulated
     * fields — use `log.set({...})` inside handlers to attach context and
     * `log.error(err)` to capture failures.
     */
    log: RequestLogger;
  };
};

export function injectContainer(container: AppContainer): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    c.set("container", container);
    await next();
  };
}
