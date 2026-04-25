/**
 * Composition root.
 *
 * Builds the `AppContainer` out of a shared `FeatureCore` (clock, bus,
 * uow, hub, …) + a list of feature modules. Each `feature.ts` owns its
 * own service wiring; composition.ts just stitches them together.
 *
 * The `// +feature:<name>` / `// -feature:<name>` fences below are what
 * the generator CLI targets when stripping a feature from the kit.
 * Keep the fence markers on their own line, with the matching closing
 * fence, so the strip pass can be a dumb line-range delete.
 *
 * No side effects here: nothing subscribes to the event bus, nothing
 * touches the DB. Call `startBackgroundWork` from your runtime entry
 * point (index.ts) to wire projectors onto the bus. Tests can
 * instantiate this freely and pass `overrides` to swap any primitive.
 */
import type { Clock } from "@/kernel/clock.ts";
import { SystemClock } from "@/kernel/clock.ts";
import { InProcessEventBus, type EventBus } from "@/kernel/events.ts";
import type { FeatureCore } from "@/kernel/feature.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import { ConsoleMailer, type Mailer } from "@/infrastructure/mailer.ts";
// +feature:orm-prisma
import { PrismaUnitOfWork } from "@/infrastructure/prisma-uow.ts";
import { getPrisma, type Prisma } from "@/infrastructure/prisma.ts";
// -feature:orm-prisma
// +feature:realtime
import { InProcessRealtimeHub, type RealtimeHub } from "@/realtime/hub.ts";
import { PresenceTracker } from "@/realtime/presence-tracker.ts";
import { RealtimeEventPublisher } from "@/realtime/realtime-event-publisher.ts";
// -feature:realtime
import { buildBetterAuth } from "@/interfaces/http/better-auth.ts";
import { identityFeature, type IdentityServices } from "@/identity/feature.ts";
import type { UserId } from "@/identity/domain/user.ts";
import { workspacesFeature, type WorkspacesServices } from "@/workspaces/feature.ts";

export interface AppConfig {
  authSecret: string;
  apiOrigin: string;
  // +feature:auth-magic-link
  magicLinkTtlMinutes: number;
  // -feature:auth-magic-link
  webOrigin: string;
  wwwOrigin: string;
  /**
   * Additional browser origins that should be allowed by CORS and
   * trusted by better-auth. Useful when running multiple frontend shells
   * against one API (e.g. the Next.js dev server on :4003 alongside the
   * canonical TanStack Start app on :4001). Comma-separated via
   * `ADDITIONAL_WEB_ORIGINS` in the environment.
   */
  additionalOrigins: string[];
  cookieSecure: boolean;
  /**
   * Optional parent domain for auth cookies (e.g. `.wereorbit.com`),
   * loaded from `AUTH_COOKIE_DOMAIN`. When set, cookies are shared
   * across subdomains so the demo flow's session minted on the API
   * subdomain is readable on the app subdomain.
   */
  cookieDomain?: string;
  // +feature:auth-oauth
  social?: {
    google?: { clientId: string; clientSecret: string };
    apple?: { clientId: string; clientSecret: string };
  };
  // -feature:auth-oauth
}

/**
 * Full set of services available on the container. Built as a union of
 * each active feature's services record so stripping a feature (and
 * removing its spread in `buildContainer`) naturally removes the
 * corresponding keys from this type.
 */
export type AppServices = IdentityServices &
  WorkspacesServices &
  {};

export interface AppContainer {
  config: AppConfig;
  // +feature:orm-prisma
  prisma: Prisma;
  // -feature:orm-prisma
  clock: Clock;
  bus: EventBus;
  uow: UnitOfWork;
  mailer: Mailer;
  // +feature:realtime
  hub: RealtimeHub;
  presence: PresenceTracker;
  // -feature:realtime
  auth: ReturnType<typeof buildBetterAuth>;
  services: AppServices;
  background: {
    // +feature:realtime
    realtimeEventPublisher: RealtimeEventPublisher;
    // -feature:realtime
  };
}


function buildDefaultMailer(): Mailer {
  return new ConsoleMailer();
}

export function readConfig(): AppConfig {
  const authSecret = process.env.BETTER_AUTH_SECRET ?? "";
  if (!authSecret) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }
  // +feature:auth-oauth
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appleClientId = process.env.APPLE_CLIENT_ID;
  const appleClientSecret = process.env.APPLE_CLIENT_SECRET;
  const social: NonNullable<AppConfig["social"]> = {};
  if (googleClientId && googleClientSecret) {
    social.google = { clientId: googleClientId, clientSecret: googleClientSecret };
  }
  if (appleClientId && appleClientSecret) {
    social.apple = { clientId: appleClientId, clientSecret: appleClientSecret };
  }
  // -feature:auth-oauth
  return {
    authSecret,
    apiOrigin: process.env.API_ORIGIN ?? "http://localhost:4002",
    // +feature:auth-magic-link
    magicLinkTtlMinutes: Number(process.env.MAGIC_LINK_TTL_MIN ?? 15),
    // -feature:auth-magic-link
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:4001",
    wwwOrigin: process.env.WWW_ORIGIN ?? "http://localhost:4000",
    additionalOrigins: (process.env.ADDITIONAL_WEB_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    cookieSecure: (process.env.NODE_ENV ?? "development") === "production",
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined,
    // +feature:auth-oauth
    social: Object.keys(social).length > 0 ? social : undefined,
    // -feature:auth-oauth
  };
}

export function buildContainer(
  config: AppConfig,
  overrides: Partial<Omit<AppContainer, "config">> = {},
): AppContainer {
  // +feature:orm-prisma
  const prisma = overrides.prisma ?? getPrisma();
  // -feature:orm-prisma
  const clock = overrides.clock ?? new SystemClock();
  const bus = overrides.bus ?? new InProcessEventBus();
  // The ORM fences below are mutually exclusive at scaffold time: the
  // CLI strips exactly one, leaving a single return reachable. In the
  // monorepo both branches exist in source — the Prisma return runs
  // first, and the Drizzle branch is dead code kept here so the strip
  // engine can swap them. Don't collapse into one statement.
  const buildDefaultUow = (): UnitOfWork => {
    // +feature:orm-prisma
    return new PrismaUnitOfWork(prisma, bus);
    // -feature:orm-prisma
  };
  const uow = overrides.uow ?? buildDefaultUow();
  const mailer = overrides.mailer ?? buildDefaultMailer();
  // +feature:realtime
  const hub = overrides.hub ?? new InProcessRealtimeHub();
  const presence = overrides.presence ?? new PresenceTracker(hub, clock);
  // -feature:realtime

  // Declared before buildBetterAuth so the closure can capture it.
  // Filled in after `services` is built below.
  const accountHooks: {
    assertUserCanBeDeleted?: (userId: string) => Promise<void>;
  } = {};

  const auth =
    overrides.auth ??
    buildBetterAuth(
      {
        authSecret: config.authSecret,
        apiOrigin: config.apiOrigin,
        webOrigin: config.webOrigin,
        wwwOrigin: config.wwwOrigin,
        additionalOrigins: config.additionalOrigins,
        cookieSecure: config.cookieSecure,
        cookieDomain: config.cookieDomain,
        // +feature:auth-magic-link
        magicLinkTtlMinutes: config.magicLinkTtlMinutes,
        // -feature:auth-magic-link
        // +feature:auth-oauth
        social: config.social,
        // -feature:auth-oauth
        accountHooks,
      },
      {
        uow,
        mailer,
        // +feature:orm-prisma
        prisma,
        // -feature:orm-prisma
      },
    );


  const core: FeatureCore = {
    config,
    // +feature:orm-prisma
    prisma,
    // -feature:orm-prisma
    clock,
    bus,
    uow,
    mailer,
    // +feature:realtime
    hub,
    presence,
    // -feature:realtime
    auth,
  };

  const services: AppServices =
    overrides.services ??
    (() => {
      const identitySvc = identityFeature.services(core);
      const workspacesSvc = workspacesFeature.services(core);
      return {
        ...identitySvc,
        ...workspacesSvc,
      } satisfies AppServices;
    })();

  accountHooks.assertUserCanBeDeleted = (userId) =>
    services.assertUserCanBeDeleted.execute(userId as UserId);

  const background = overrides.background ?? {
    // +feature:realtime
    realtimeEventPublisher: new RealtimeEventPublisher(bus, hub, uow),
    // -feature:realtime
  };


  return {
    config,
    // +feature:orm-prisma
    prisma,
    // -feature:orm-prisma
    clock,
    bus,
    uow,
    mailer,
    // +feature:realtime
    hub,
    presence,
    // -feature:realtime
    auth,
    services,
    background,
  };
}

/**
 * Subscribe projectors and publishers to the event bus. This is the
 * only place where `buildContainer`'s output becomes "live" — tests
 * that don't need background work can simply skip this call.
 */
export function startBackgroundWork(container: AppContainer): void {
  // +feature:realtime
  container.background.realtimeEventPublisher.start();
  // -feature:realtime
  void container;
}
