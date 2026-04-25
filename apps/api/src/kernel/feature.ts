/**
 * Feature modules let each bounded context own its own service wiring.
 *
 * Rather than composing the whole app in one ~400 line composition root,
 * each context (identity, workspaces, teams, billing, …) exports a
 * `FeatureModule` with a `services(core)` factory that returns its slice
 * of the container. `composition.ts` stitches them together with `...`
 * spreads so the full `AppContainer['services']` type is the union of
 * every active module's output.
 *
 * This shape is also what the generator CLI targets: to strip a feature,
 * remove its `feature.ts`, delete the fenced call in composition.ts, and
 * TypeScript naturally forgets the matching services ever existed.
 *
 * Intentionally tiny — no runtime resolution, no decorators, no magic.
 * The `overrides` param on `buildContainer` is still the test seam.
 */
import type { Clock } from "@/kernel/clock.ts";
import type { EventBus } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { Mailer } from "@/infrastructure/mailer.ts";
// +feature:orm-prisma
import type { Prisma } from "@/infrastructure/prisma.ts";
// -feature:orm-prisma
// +feature:realtime
import type { RealtimeHub } from "@/realtime/hub.ts";
import type { PresenceTracker } from "@/realtime/presence-tracker.ts";
// -feature:realtime
import type { buildBetterAuth } from "@/interfaces/http/better-auth.ts";
import type { AppConfig } from "@/composition.ts";

/**
 * The cross-cutting primitives every feature can pull from. Anything
 * feature-specific (billing provider, stripe client, …) is constructed
 * inside that feature's own module, not hoisted into `FeatureCore`.
 */
export interface FeatureCore {
  readonly config: AppConfig;
  // +feature:orm-prisma
  readonly prisma: Prisma;
  // -feature:orm-prisma
  readonly clock: Clock;
  readonly bus: EventBus;
  readonly uow: UnitOfWork;
  readonly mailer: Mailer;
  // +feature:realtime
  readonly hub: RealtimeHub;
  readonly presence: PresenceTracker;
  // -feature:realtime
  readonly auth: ReturnType<typeof buildBetterAuth>;
}

/**
 * A feature contributes a named slice of services to the container.
 * `S` is intentionally open-ended so each module keeps its own shape
 * — composition.ts unions them at call time.
 */
export interface FeatureModule<S> {
  readonly name: string;
  readonly services: (core: FeatureCore) => S;
}

/**
 * Infer the services record type from a `FeatureModule` — used by
 * `composition.ts` to build the top-level `AppContainer['services']`
 * type without hand-listing every key.
 */
export type FeatureServices<F> = F extends FeatureModule<infer S> ? S : never;
