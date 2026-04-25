import {
  isNavGroup,
  type NavGroup,
  type NavItem,
  type NavLeaf,
  navMainItems,
} from "@orbit/shared/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@orbit/ui/collapsible";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@orbit/ui/menu";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
  useSidebarMenuOpen,
} from "@orbit/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "./icon";
import { useCan } from "@/lib/permissions";

function useActivePathname(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}

function isLeafActive(pathname: string, slug: string, leaf: NavLeaf): boolean {
  if (leaf.segment === "") return pathname === `/d/${slug}`;
  return pathname.startsWith(`/d/${slug}/${leaf.segment}`);
}

function usePermissionGate(permission: NavLeaf["permission"]): boolean {
  if (!permission) return true;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCan(permission);
}

function useVisibleChildren(items: NavLeaf[]): NavLeaf[] {
  return items
    .map((item) => ({ item, allowed: usePermissionGate(item.permission) }))
    .filter((x) => x.allowed)
    .map((x) => x.item);
}

function Leaf({ item, slug }: { item: NavLeaf; slug: string }) {
  const pathname = useActivePathname();
  const allowed = usePermissionGate(item.permission);
  if (!allowed) return null;
  const active = isLeafActive(pathname, slug, item);
  const to =
    item.segment === ""
      ? ("/d/$workspaceSlug" as const)
      : (`/d/$workspaceSlug/${item.segment}` as "/d/$workspaceSlug");
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        render={<Link to={to} params={{ workspaceSlug: slug }} />}
        tooltip={item.title}
      >
        <NavIcon name={item.icon} className="size-4" />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function Group({ item, slug }: { item: NavGroup; slug: string }) {
  const pathname = useActivePathname();
  const { registerMenu } = useSidebarMenuOpen();
  const { state, isMobile } = useSidebar();
  const isIconMode = state === "collapsed" && !isMobile;

  const visibleChildren = useVisibleChildren(item.items);

  const active = useMemo(
    () =>
      visibleChildren.some((c) =>
        pathname.startsWith(`/d/${slug}/${c.segment}`),
      ),
    [visibleChildren, pathname, slug],
  );
  const [expanded, setExpanded] = useState(active);
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  const unregisterRef = useRef<(() => void) | null>(null);
  useEffect(() => () => unregisterRef.current?.(), []);

  if (visibleChildren.length === 0) return null;

  if (isIconMode) {
    return (
      <SidebarMenuItem>
        <Menu
          onOpenChange={(open) => {
            if (open) unregisterRef.current = registerMenu();
            else {
              unregisterRef.current?.();
              unregisterRef.current = null;
            }
          }}
        >
          <SidebarMenuButton
            aria-label={item.title}
            isActive={active}
            render={<MenuTrigger />}
            tooltip={item.title}
          >
            <NavIcon name={item.icon} className="size-4" />
          </SidebarMenuButton>
          <MenuPopup align="start" alignOffset={0} side="right">
            <MenuGroup>
              <MenuGroupLabel>{item.title}</MenuGroupLabel>
              {visibleChildren.map((child) => (
                <MenuItem
                  key={child.key}
                  render={
                    <Link
                      to={
                        `/d/$workspaceSlug/${child.segment}` as "/d/$workspaceSlug"
                      }
                      params={{ workspaceSlug: slug }}
                    />
                  }
                >
                  <span>{child.title}</span>
                </MenuItem>
              ))}
            </MenuGroup>
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        open={expanded}
        onOpenChange={setExpanded}
        data-state={expanded ? "open" : "closed"}
      >
        <CollapsibleTrigger
          className="justify-between"
          render={<SidebarMenuButton tooltip={item.title} />}
        >
          <span className="flex items-center gap-2">
            <NavIcon name={item.icon} className="size-4" />
            <span>{item.title}</span>
          </span>
          <ChevronRightIcon className="opacity-80 transition-transform in-data-open:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-0 gap-0.5 border-none px-0">
            {visibleChildren.map((child) => (
              <SidebarMenuSubItem key={child.key}>
                <SidebarMenuSubButton
                  className="ps-8 hover:bg-transparent active:bg-transparent data-[active=true]:bg-sidebar-accent"
                  isActive={pathname.startsWith(`/d/${slug}/${child.segment}`)}
                  render={
                    <Link
                      to={
                        `/d/$workspaceSlug/${child.segment}` as "/d/$workspaceSlug"
                      }
                      params={{ workspaceSlug: slug }}
                    />
                  }
                >
                  <span>{child.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function NavMain({ slug }: { slug: string }): React.ReactElement {
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-0.5">
        {navMainItems.map((item: NavItem) =>
          isNavGroup(item) ? (
            <Group key={item.key} item={item} slug={slug} />
          ) : (
            <Leaf key={item.key} item={item} slug={slug} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
