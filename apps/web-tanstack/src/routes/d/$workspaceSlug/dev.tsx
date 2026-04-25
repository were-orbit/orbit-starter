import { createFileRoute, redirect } from "@tanstack/react-router";
import { DevPage } from "@/pages/dev-page";

export const Route = createFileRoute("/d/$workspaceSlug/dev")({
  beforeLoad: ({ params }) => {
    if (!import.meta.env.DEV) {
      throw redirect({
        to: "/d/$workspaceSlug",
        params: { workspaceSlug: params.workspaceSlug },
      });
    }
  },
  component: DevPage,
});
