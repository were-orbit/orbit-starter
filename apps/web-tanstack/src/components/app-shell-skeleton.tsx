import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@orbit/ui/sidebar";
import { Skeleton } from "@orbit/ui/skeleton";

export function AppShellSkeleton() {
  return (
    <SidebarProvider className="flex h-svh min-h-svh overflow-hidden">
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <Skeleton className="h-8 w-full rounded-md" />
        </SidebarHeader>
        <SidebarContent>
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter>
          <Skeleton className="h-8 w-full rounded-md" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex h-full items-center justify-center p-8">
          <Skeleton className="h-40 w-full max-w-3xl rounded-lg" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
