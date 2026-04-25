import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, Settings2Icon } from "lucide-react";
import { useState } from "react";
import { OrbitAvatarField } from "@orbit/ui/orbit-avatar-field";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@orbit/ui/menu";
import { meQueryOptions } from "@/lib/queries/session";
import { type WorkspaceView } from "@/lib/workspace";

export function AppLogo({ ws }: { ws: WorkspaceView }) {
  const navigate = useNavigate();
  const { data: me } = useQuery(meQueryOptions);
  const workspaces = me?.workspaces ?? [];
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSwitch = (slug: string) => {
    if (slug === ws.slug) return;
    navigate({
      to: "/d/$workspaceSlug",
      params: { workspaceSlug: slug },
    });
  };

  const handleCreate = () => {
    navigate({ to: "/onboarding", search: { mode: "additional" } });
  };

  return (
    <Menu open={menuOpen} onOpenChange={setMenuOpen}>
      <MenuTrigger
        className="group flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-1.5 transition-[background-color,color,scale] duration-150 ease-out hover:bg-sidebar-accent active:scale-[0.96] data-[popup-open]:bg-sidebar-accent group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!"
        aria-label="Switch workspace"
        title="Switch workspace (⌘⇧O)"
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-foreground/[0.04] shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:bg-foreground/[0.06] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.14)]">
          <OrbitAvatarField seed={ws.slug} size={20} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium group-data-[collapsible=icon]:hidden">
          {ws.name}
        </span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground/60 transition-colors duration-150 ease-out group-hover:text-muted-foreground group-data-[collapsible=icon]:hidden" />
      </MenuTrigger>
      <MenuPopup align="start" side="bottom" sideOffset={6} className="w-64">
        <MenuGroup>
          <MenuGroupLabel>Workspaces</MenuGroupLabel>
          {workspaces.length === 0 ? (
            <MenuItem disabled>
              <span className="text-muted-foreground">No workspaces yet</span>
            </MenuItem>
          ) : (
            workspaces.map((w) => {
              const active = w.slug === ws.slug;
              return (
                <MenuItem
                  key={w.id}
                  onClick={() => {
                    handleSwitch(w.slug);
                  }}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-sm bg-foreground/[0.04] shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:bg-foreground/[0.06] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.14)]">
                    <OrbitAvatarField seed={w.slug} size={16} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium leading-tight">
                      {w.name}
                    </span>
                    <span className="truncate font-mono text-[10.5px] text-muted-foreground tracking-tight">
                      wereorbit.com/{w.slug}
                    </span>
                  </span>
                  {active ? (
                    <CheckIcon className="ml-auto size-4 text-muted-foreground" />
                  ) : null}
                </MenuItem>
              );
            })
          )}
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuItem
            onClick={() => {
              navigate({
                to: "/d/$workspaceSlug/workspace/settings/$section",
                params: { workspaceSlug: ws.slug, section: "general" },
              });
            }}
          >
            <Settings2Icon />
            <span>Workspace settings</span>
          </MenuItem>
          <MenuItem onClick={handleCreate}>
            <PlusIcon />
            <span>Create workspace</span>
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
