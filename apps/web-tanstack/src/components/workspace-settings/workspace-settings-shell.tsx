import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@orbit/ui/button";
import { cn } from "@orbit/ui/lib/utils";
import { useWorkspaceSlug } from "@/lib/use-workspace-slug";
import { useWorkspace } from "@/lib/workspace";

const NAV = [
  { segment: "general", label: "General" },
  { segment: "appearance", label: "Appearance" },
  { segment: "members", label: "Members" },
  { segment: "roles", label: "Roles" },
  { segment: "integrations", label: "Integrations" },
] as const;

export function WorkspaceSettingsShell() {
  const ws = useWorkspace();
  const workspaceSlug = useWorkspaceSlug() ?? ws?.slug;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!ws || !workspaceSlug) return null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-background">
      <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-2 border-border/50 border-b bg-background/80 px-3 backdrop-blur md:px-4">
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-none">
          Workspace settings
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 text-muted-foreground"
          render={<Link to="/d/$workspaceSlug" params={{ workspaceSlug }} />}
        >
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Button>
      </header>

      <nav
        aria-label="Settings sections"
        className="sticky top-11 z-10 border-border/50 border-b bg-background/95 px-3 backdrop-blur md:px-4"
      >
        <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => {
            const fullPath = `/d/${workspaceSlug}/workspace/settings/${item.segment}`;
            const active = pathname === fullPath;
            return (
              <Link
                key={item.segment}
                to="/d/$workspaceSlug/workspace/settings/$section"
                params={{ workspaceSlug, section: item.segment }}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6">
        <Outlet />
      </div>
    </div>
  );
}
