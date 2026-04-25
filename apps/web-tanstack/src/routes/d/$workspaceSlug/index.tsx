import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceHomePage } from "@/pages/workspace-home/home-page";

export const Route = createFileRoute("/d/$workspaceSlug/")({
  component: WorkspaceHomePage,
});
