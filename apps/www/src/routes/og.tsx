import { createFileRoute } from "@tanstack/react-router";
import { renderOg } from "@/lib/og-render";

export const Route = createFileRoute("/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const title =
          url.searchParams.get("title")?.slice(0, 200) ??
          "Orbit — move together";
        const kicker = url.searchParams.get("kicker")?.slice(0, 80) ?? undefined;
        const description =
          url.searchParams.get("description")?.slice(0, 200) ?? undefined;
        const variant =
          url.searchParams.get("variant") === "docs" ? "docs" : "marketing";

        return renderOg({
          title,
          kicker,
          description,
          variant,
          origin: url.origin,
        });
      },
    },
  },
});
