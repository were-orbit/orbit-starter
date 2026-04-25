/**
 * Shared better-auth client for the web app.
 *
 * Mirrors the server-side `buildBetterAuth` config (see `apps/api/src/interfaces/http/better-auth.ts`):
 *   - magicLink plugin is enabled server-side, so we register `magicLinkClient()` here.
 *   - Google / Apple social providers are optional server-side; social sign-in is
 *     invoked via `authClient.signIn.social(...)`, which doesn't require a plugin.
 *
 * The client handles the auth cookie automatically (same-origin-style fetch with
 * `credentials: "include"`), matches the server `/v1/auth` prefix, and surfaces
 * errors as `{ data, error }` from better-fetch rather than rejecting. Call sites
 * should check `result.error` and throw an `ApiError` so react-query can observe
 * the failure; see `callAuth` in `./mutations.ts` for the helper.
 */
import { createAuthClient } from "better-auth/react";
// +feature:auth-admin
import { adminClient } from "better-auth/client/plugins";
// -feature:auth-admin
// +feature:auth-magic-link
import { magicLinkClient } from "better-auth/client/plugins";
// -feature:auth-magic-link
import { API_URL } from "@/lib/urls";

export const authClient = createAuthClient({
  baseURL: `${API_URL}/v1/auth`,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    // +feature:auth-magic-link
    magicLinkClient(),
    // -feature:auth-magic-link
    // +feature:auth-admin
    adminClient(),
    // -feature:auth-admin
  ],
});
