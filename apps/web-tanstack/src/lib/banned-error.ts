/**
 * The better-auth admin plugin rejects banned accounts with a stable
 * `BANNED_USER` error code. It reaches the browser in two shapes we
 * both need to recognise:
 *   1. As an `ApiError` from the magic-link / sign-in mutations —
 *      detected by the login form's `onError` (the form mutations wrap
 *      better-auth's `{ error: { code } }` response into `ApiError.code`).
 *   2. As a `?error=BANNED_USER` query param when the OAuth callback
 *      handler redirects to `onAPIError.errorURL`, OR when the API's
 *      magic-link verify interceptor (`apps/api/src/app.ts`) redirects
 *      a banned-link click here from the verify endpoint.
 */
const BANNED_ERROR_CODE = "BANNED_USER";

export function isBannedUserError(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" && code === BANNED_ERROR_CODE) return true;
  }
  return false;
}

export function isBannedUserSearchParam(error: unknown): boolean {
  if (typeof error !== "string" || !error) return false;
  return error.replace(/_/g, " ").trim().toUpperCase() ===
    BANNED_ERROR_CODE.replace(/_/g, " ");
}
