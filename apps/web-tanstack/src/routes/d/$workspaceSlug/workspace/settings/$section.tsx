import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspaceSettingsSectionPage } from "@/pages/workspace-settings/section-page";

const SECTIONS = new Set([
  "general",
  "appearance",
  "members",
  "roles",
  "integrations",
]);

export const Route = createFileRoute("/d/$workspaceSlug/workspace/settings/$section")({
  beforeLoad: ({ params }) => {
    if (!SECTIONS.has(params.section)) {
      throw redirect({
        to: "/d/$workspaceSlug/workspace/settings/$section",
        params: { workspaceSlug: params.workspaceSlug, section: "general" },
      });
    }
  },
  component: WorkspaceSettingsSectionPage,
});
