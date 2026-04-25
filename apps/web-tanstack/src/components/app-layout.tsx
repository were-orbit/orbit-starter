import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@orbit/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import type { WorkspaceView } from "@/lib/workspace";

export function AppLayout({
  ws,
  onReset,
  children,
}: {
  ws: WorkspaceView;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <SidebarProvider className="flex h-svh min-h-svh overflow-hidden">
      <AppSidebar ws={ws} onReset={onReset} />
      <SidebarInset className="flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/50 px-3 md:hidden">
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
