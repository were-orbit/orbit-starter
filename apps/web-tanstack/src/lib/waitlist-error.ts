/**
 * The waitlist gate lives on the server in `assertWaitlistAllowsNewUser`
 * and throws with a stable message prefix. It reaches the browser in two
 * shapes we both need to recognise:
 *   1. As an `ApiError` when the magic-link / sign-up request is rejected
 *      synchronously — detected by the login form's `onError`.
 *   2. As a `?error=Sign-in_isn%E2%80%99t_open...` query param when the
 *      OAuth callback handler redirects to `onAPIError.errorURL`. Better-
 *      auth joins the message with underscores before redirecting.
 * We match on the prefix so copy tweaks don't silently detach this.
 */
const WAITLIST_ERROR_PREFIX = "sign-in isn";

export function isWaitlistBlockedError(err: unknown): boolean {
  if (!(err instanceof Error) || !err.message) return false;
  return err.message.toLowerCase().startsWith(WAITLIST_ERROR_PREFIX);
}

export function isWaitlistBlockedSearchParam(error: unknown): boolean {
  if (typeof error !== "string" || !error) return false;
  return error.replace(/_/g, " ").toLowerCase().startsWith(
    WAITLIST_ERROR_PREFIX,
  );
}
