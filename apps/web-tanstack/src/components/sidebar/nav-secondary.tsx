import { navFooterItems } from "@orbit/shared/navigation";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@orbit/ui/sidebar";
import { NavIcon } from "./icon";
import { WWW_URL } from "@/lib/urls";
import type { ComponentPropsWithoutRef } from "react";

function resolveHref(segment: string): string {
  if (segment === "__external:docs") return `${WWW_URL}/docs`;
  if (segment === "__external:changelog") return `${WWW_URL}/changelog`;
  return segment;
}

export function NavSecondary({
  ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup>): React.ReactElement {
  return (
    <SidebarGroup {...props}>
      <SidebarMenu className="gap-0.5">
        {navFooterItems.map((item) => (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton
              render={
                <a
                  href={resolveHref(item.segment)}
                  rel="noreferrer"
                  target="_blank"
                />
              }
              tooltip={item.title}
            >
              <NavIcon name={item.icon} className="size-4" />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
