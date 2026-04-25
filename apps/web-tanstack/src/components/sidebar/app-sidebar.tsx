import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@orbit/ui/sidebar";
import { AppLogo } from "@/components/app-logo";
import { UserMenu } from "@/components/user-menu";
import type { WorkspaceView } from "@/lib/workspace";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";

export function AppSidebar({
  ws,
  onReset,
}: {
  ws: WorkspaceView;
  onReset: () => void;
}): React.ReactElement {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <AppLogo ws={ws} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain slug={ws.slug} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu ws={ws} onReset={onReset} />
      </SidebarFooter>
    </Sidebar>
  );
}
