import { WWW_URL } from "./urls";

export type OgMetaInput = {
  title: string;
  description?: string;
  kicker?: string;
  variant?: "marketing" | "docs";
  /** Path on www, used for og:url. Optional — defaults to no path. */
  path?: string;
};

/** Absolute URL to the dynamic OG image renderer. */
export function ogImageUrl(input: OgMetaInput): string {
  const params = new URLSearchParams();
  params.set("title", input.title);
  if (input.kicker) params.set("kicker", input.kicker);
  if (input.description) params.set("description", input.description);
  if (input.variant) params.set("variant", input.variant);
  return `${WWW_URL}/og?${params.toString()}`;
}

/**
 * Convenience wrapper for docs routes. Pair with TanStack Start's `head()`:
 *
 *   head: () => docsRouteHead(meta),
 *
 * Sets <title>, og:title, og:description, og:image, twitter:card etc. all in
 * one shot, and suffixes "· Orbit docs" on the page title.
 */
export function docsRouteHead(input: {
  title: string;
  description: string;
  path?: string;
}) {
  const fullTitle = `${input.title} · Orbit docs`;
  return {
    meta: [
      { title: fullTitle },
      ...socialMeta({
        title: fullTitle,
        description: input.description,
        variant: "docs" as const,
        path: input.path,
      }),
    ],
  };
}

/**
 * Standard set of social meta tags for a page. Pass these to TanStack Start's
 * route `head().meta` array. Includes Open Graph + Twitter cards + canonical
 * title/description.
 */
export function socialMeta(input: OgMetaInput) {
  const image = ogImageUrl(input);
  const url = input.path ? `${WWW_URL}${input.path}` : WWW_URL;
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
