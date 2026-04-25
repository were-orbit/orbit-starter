import { betterAuth } from "better-auth";
// +feature:auth-admin
import { admin } from "better-auth/plugins";
// -feature:auth-admin
// +feature:auth-magic-link
import { magicLink } from "better-auth/plugins";
// -feature:auth-magic-link
// +feature:orm-prisma
import { prismaAdapter } from "@better-auth/prisma-adapter";
import type { Prisma } from "@/infrastructure/prisma.ts";
// -feature:orm-prisma
import type { Mailer } from "@/infrastructure/mailer.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import { expandLoopbackOrigins } from "@/kernel/dev-origins.ts";

// +feature:auth-oauth
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
}
// -feature:auth-oauth

export interface BetterAuthConfig {
  authSecret: string;
  apiOrigin: string;
  webOrigin: string;
  wwwOrigin: string;
  /** Extra browser origins to include in better-auth's `trustedOrigins`. */
  additionalOrigins?: string[];
  cookieSecure: boolean;
  /**
   * When set, scopes auth cookies to this domain so they're shared
   * across subdomains (api/app/www). Required in prod when the API
   * mints sessions on one host (api.wereorbit.com) and the app reads
   * them on another (app.wereorbit.com). Leave undefined for single-
   * host dev — better-auth then host-scopes the cookie as before.
   * Should start with a leading dot, e.g. `.wereorbit.com`.
   */
  cookieDomain?: string;
  // +feature:auth-magic-link
  magicLinkTtlMinutes: number;
  // -feature:auth-magic-link
  // +feature:auth-oauth
  /**
   * Optional third-party OAuth providers. Each is registered with better-auth only when
   * its client id + secret are present, so a missing provider doesn't crash startup.
   * Callers on the web still see the button; clicking it surfaces a provider-error if
   * credentials aren't configured on the server.
   */
  social?: {
    google?: OAuthProviderConfig;
    apple?: OAuthProviderConfig;
  };
  // -feature:auth-oauth
  /**
   * Optional hook invoked by better-auth's `deleteUser.beforeDelete`.
   * Throws to block deletion (surfaced to the client as a 4xx). The
   * composition root passes a thunk here so the hook can read the
   * `AssertUserCanBeDeletedService` that is built after better-auth.
   */
  accountHooks?: {
    assertUserCanBeDeleted?: (userId: string) => Promise<void>;
  };
}

export interface BetterAuthDeps {
  uow: UnitOfWork;
  mailer: Mailer;
  // +feature:orm-prisma
  prisma: Prisma;
  // -feature:orm-prisma
}

export function buildBetterAuth(config: BetterAuthConfig, deps: BetterAuthDeps) {
  const { uow, mailer } = deps;
  // +feature:auth-oauth
  const socialProviders: Record<string, OAuthProviderConfig> = {};
  if (config.social?.google) socialProviders.google = config.social.google;
  if (config.social?.apple) socialProviders.apple = config.social.apple;
  // -feature:auth-oauth

  return betterAuth({
    secret: config.authSecret,
    baseURL: `${config.apiOrigin}/v1/auth`,
    trustedOrigins: expandLoopbackOrigins([
      config.webOrigin,
      config.wwwOrigin,
      config.apiOrigin,
      ...(config.additionalOrigins ?? []),
    ]),
    // The CLI strips exactly one of the two ORM fences. In the monorepo
    // the Prisma branch is the active return; the Drizzle return below
    // is kept as scaffolded-in alternative and becomes the active one
    // when `orm-prisma` is stripped out.
    database: (() => {
      // +feature:orm-prisma
      return prismaAdapter(deps.prisma, { provider: "postgresql" });
      // -feature:orm-prisma
    })(),
    /**
     * OAuth callbacks surface errors by redirecting to `errorURL` with a
     * `?error=...` query param. We route back to `/login` on the web app
     * so the login page can render a contextual message (including the
     * waitlist soft-landing) instead of better-auth's default `/error`
     * page. Magic-link verify doesn't honour this — see the waitlist
     * pre-check in `sendMagicLink` below for that path.
     */
    onAPIError: {
      errorURL: `${config.webOrigin}/login`,
    },
    advanced: {
      defaultCookieAttributes: {
        secure: config.cookieSecure,
        sameSite: "lax",
        httpOnly: true,
      },
      ...(config.cookieDomain
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: config.cookieDomain,
            },
          }
        : {}),
    },
    // +feature:auth-oauth
    socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
    // -feature:auth-oauth
    user: {
      changeEmail: {
        enabled: true,
        // Two mails: verification link to the new address (required),
        // plus a best-effort FYI to the current address so a stolen
        // session can't silently flip the email. FYI failure is logged
        // but never blocks the verification send.
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await mailer.sendChangeEmailVerification({
            to: newEmail,
            currentEmail: user.email,
            link: url,
          });
          try {
            await mailer.sendChangeEmailNotice({
              to: user.email,
              newEmail,
            });
          } catch (err) {
            console.error(
              "[auth] failed to send change-email notice to current address:",
              err,
            );
          }
        },
      },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const hook = config.accountHooks?.assertUserCanBeDeleted;
          if (hook) await hook(user.id);
        },
        sendDeleteAccountVerification: async ({ user, url }) => {
          await mailer.sendAccountDeletionVerification({
            to: user.email,
            link: url,
          });
        },
      },
    },
    plugins: [
      // +feature:auth-magic-link
      magicLink({
        expiresIn: config.magicLinkTtlMinutes * 60,
        sendMagicLink: async ({ email, token, url }) => {
          await mailer.sendMagicLink({
            to: email,
            token,
            link: url,
            expiresAt: new Date(Date.now() + config.magicLinkTtlMinutes * 60_000),
          });
        },
      }),
      // -feature:auth-magic-link
      // +feature:auth-admin
      admin(),
      // -feature:auth-admin
    ],
  });
}
