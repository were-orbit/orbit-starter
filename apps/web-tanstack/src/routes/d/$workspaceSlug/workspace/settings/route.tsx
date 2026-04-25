import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspaceSettingsShell } from "@/components/workspace-settings/workspace-settings-shell";

export const Route = createFileRoute("/d/$workspaceSlug/workspace/settings")({
  beforeLoad: ({ location, params }) => {
    const p = location.pathname;
    const prefix = `/d/${params.workspaceSlug}/workspace/settings`;
    if (p === prefix || p === `${prefix}/`) {
      throw redirect({
        to: "/d/$workspaceSlug/workspace/settings/$section",
        params: { workspaceSlug: params.workspaceSlug, section: "general" },
      });
    }
  },
  component: WorkspaceSettingsShell,
});
