import { createFileRoute } from "@tanstack/react-router";

/** `/` — redirect logic lives on `__root` `beforeLoad` so it always runs. */
export const Route = createFileRoute("/")({
  component: () => null,
});
