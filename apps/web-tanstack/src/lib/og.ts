import { WEB_URL } from "./urls";

export type OgMetaInput = {
  title: string;
  description?: string;
  kicker?: string;
  /** Path on the web app, used for og:url. */
  path?: string;
};

export function ogImageUrl(input: OgMetaInput): string {
  const params = new URLSearchParams();
  params.set("title", input.title);
  if (input.kicker) params.set("kicker", input.kicker);
  if (input.description) params.set("description", input.description);
  return `${WEB_URL}/og?${params.toString()}`;
}

/**
 * Open Graph + Twitter Card meta tags. Spread into a route's
 * `head().meta` array.
 */
export function socialMeta(input: OgMetaInput) {
  const image = ogImageUrl(input);
  const url = input.path ? `${WEB_URL}${input.path}` : WEB_URL;
  return [
    { name: "description", content: input.description ?? "" },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description ?? "" },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description ?? "" },
    { name: "twitter:image", content: image },
  ];
}
