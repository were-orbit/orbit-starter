/**
 * Browsers treat `localhost` and `127.0.0.1` as different origins. When local
 * config lists one, allow the other for CORS / better-auth `trustedOrigins`.
 */
export function expandLoopbackOrigins(origins: readonly string[]): string[] {
  const next = new Set<string>();
  for (const raw of origins) {
    const u = raw.trim();
    if (!u) continue;
    next.add(u);
    try {
      const url = new URL(u);
      if (url.hostname === "localhost") {
        const alt = new URL(u);
        alt.hostname = "127.0.0.1";
        next.add(alt.origin);
      } else if (url.hostname === "127.0.0.1") {
        const alt = new URL(u);
        alt.hostname = "localhost";
        next.add(alt.origin);
      }
    } catch {
      // ignore invalid URLs
    }
  }
  return [...next];
}
