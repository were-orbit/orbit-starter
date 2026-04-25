/**
 * Polar-hosted checkout URL for the Builder tier. Env-driven so
 * staging, production, and local dev can all point at different Polar
 * products / test-mode checkout links without a rebuild.
 *
 * - `VITE_POLAR_BUILDER_URL` — Builder tier checkout
 *
 * On success, Polar should be configured to redirect back to
 * `${WWW_ORIGIN}/thank-you?checkout_id={CHECKOUT_ID}` — that's the
 * page that prompts for a GitHub username and calls `internal/platform`
 * to resolve the checkout into its paid order and add the buyer as a
 * collaborator on were-orbit/orbit. `{CHECKOUT_ID}` is the only template
 * placeholder Polar substitutes; `order_id` is not available at redirect
 * time because the order is produced asynchronously.
 *
 * When the env var isn't set (local dev, preview builds), we fall
 * back to the pricing page so the buttons keep working without 404ing.
 */

const FALLBACK = "/pricing";

const rawBuilder = import.meta.env.VITE_POLAR_BUILDER_URL as
  | string
  | undefined;

export const CHECKOUT_URLS = {
  builder: rawBuilder && rawBuilder.trim() ? rawBuilder : FALLBACK,
} as const;

export type CheckoutTier = keyof typeof CHECKOUT_URLS;
