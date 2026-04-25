export const WWW_URL = (import.meta.env.VITE_WWW_URL as string | undefined) ?? "http://localhost:4000";
export const WEB_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? "http://localhost:4001";
const rawBuilderCheckout = import.meta.env.VITE_POLAR_BUILDER_URL as string | undefined;
export const POLAR_BUILDER_URL =
  rawBuilderCheckout && rawBuilderCheckout.trim() ? rawBuilderCheckout : `${WWW_URL}/pricing`;
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4002";
// +feature:realtime
export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? API_URL.replace(/^http/, "ws");
// -feature:realtime
