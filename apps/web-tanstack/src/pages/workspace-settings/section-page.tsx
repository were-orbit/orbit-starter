import { useParams } from "@tanstack/react-router";
import { WorkspaceAppearancePage } from "@/pages/workspace-settings/appearance-page";
import { WorkspaceGeneralPage } from "@/pages/workspace-settings/general-page";
import { WorkspaceIntegrationsPage } from "@/pages/workspace-settings/integrations-page";
import { WorkspaceMembersPage } from "@/pages/workspace-settings/members-page";
import { WorkspaceRolesPage } from "@/pages/workspace-settings/roles-page";

export function WorkspaceSettingsSectionPage() {
  const { section } = useParams({ from: "/d/$workspaceSlug/workspace/settings/$section" });

  switch (section) {
    case "general":
      return <WorkspaceGeneralPage />;
    case "appearance":
      return <WorkspaceAppearancePage />;
    case "members":
      return <WorkspaceMembersPage />;
    case "roles":
      return <WorkspaceRolesPage />;
    case "integrations":
      return <WorkspaceIntegrationsPage />;
    default:
      return null;
  }
}
