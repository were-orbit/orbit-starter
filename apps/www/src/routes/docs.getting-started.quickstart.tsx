import { createFileRoute } from "@tanstack/react-router";
import { QuickstartPage, meta } from "@/pages/docs/getting-started/quickstart";
import { docsRouteHead } from "@/lib/og";

export const Route = createFileRoute("/docs/getting-started/quickstart")({
  head: () =>
    docsRouteHead({ ...meta, path: "/docs/getting-started/quickstart" }),
  component: QuickstartPage,
});
