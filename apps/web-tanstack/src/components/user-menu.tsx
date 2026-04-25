"use client";

import { useMemo } from "react";
import type { UserDTO } from "@orbit/shared/dto";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  Moon,
  RefreshCcwIcon,
  // +feature:auth-admin
  ShieldCheckIcon,
  // -feature:auth-admin
  Sun,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@orbit/ui/menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@orbit/ui/sidebar";
import { useTheme } from "@orbit/ui/theme-provider";
import { MemberAvatar } from "@/components/member-avatar";
import { initialsFor, type Member, type WorkspaceView } from "@/lib/workspace";
import { useMeUser } from "@/lib/use-me-user";
// +feature:auth-admin
import { useIsAppAdmin } from "@/lib/hooks/use-is-app-admin";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
// -feature:auth-admin
import type { WorkspaceMemberId } from "@orbit/shared/dto";

function memberFromMeQuery(user: UserDTO, workspaceYou: Member | undefined): Member {
  // Fall back to the user's account id branded as a member id for the
  // pre-workspace-hydration case — the menu only renders the avatar
  // and name; no code reads this value back through a member lookup.
  const fallbackId = user.id as unknown as WorkspaceMemberId;
  return {
    id: workspaceYou?.id ?? fallbackId,
    name: user.name,
    email: user.email,
    initials: initialsFor(user.name, user.email),
    isYou: true,
    tone: workspaceYou?.tone ?? user.avatarTone,
    role: workspaceYou?.role ?? null,
  };
}

export function UserMenu({
  ws,
  onReset,
}: {
  ws: WorkspaceView;
  onReset: () => void;
}) {
  const { resolved, toggleLightDark } = useTheme();
  const queryMe = useMeUser();
  const queryClient = useQueryClient();
  // +feature:auth-admin
  const isAppAdmin = useIsAppAdmin();
  // -feature:auth-admin
  const you = useMemo((): Member | undefined => {
    const row = ws.members.find((m: Member) => m.isYou);
    if (queryMe) return memberFromMeQuery(queryMe, row);
    return row;
  }, [queryMe, ws.members]);
  if (!you) return null;
  const isDark = resolved === "dark";
  // +feature:auth-admin
  // Inlined env check so Vite's static analysis can tree-shake the
  // dev branch out of production bundles.
  const showMakeAdmin = import.meta.env.DEV && !isAppAdmin;
  const onMakeAdmin = async () => {
    await api.dev.makeMeAdmin();
    await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
  };
  // -feature:auth-admin

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Menu>
          <MenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              />
            }
          >
            <MemberAvatar member={you} size="sm" />
            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-[13px] font-medium">{you.name}</span>
              {you.email ? (
                <span className="truncate text-[11px] text-muted-foreground">
                  {you.email}
                </span>
              ) : null}
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </MenuTrigger>
          <MenuPopup align="end" side="top" sideOffset={8} className="w-56">
            <MenuGroup>
              <MenuGroupLabel>{ws.name}</MenuGroupLabel>
              <MenuItem onClick={toggleLightDark}>
                {isDark ? <Sun /> : <Moon />}
                <span>{isDark ? "Light mode" : "Dark mode"}</span>
              </MenuItem>
              <MenuItem onClick={onReset}>
                <RefreshCcwIcon />
                <span>Reset workspace</span>
              </MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              {/* +feature:auth-admin */}
              {isAppAdmin ? (
                <MenuItem render={<Link to="/admin" />}>
                  <ShieldCheckIcon />
                  <span>Admin</span>
                </MenuItem>
              ) : null}
              {showMakeAdmin ? (
                <MenuItem onClick={onMakeAdmin}>
                  <ShieldCheckIcon />
                  <span>Make me admin (dev)</span>
                </MenuItem>
              ) : null}
              {/* -feature:auth-admin */}
              {import.meta.env.DEV ? (
                <MenuItem
                  render={
                    <Link
                      to="/d/$workspaceSlug/dev"
                      params={{ workspaceSlug: ws.slug }}
                    />
                  }
                >
                  <WrenchIcon />
                  <span>Dev tools</span>
                </MenuItem>
              ) : null}
              <MenuItem render={<Link to="/account" />}>
                <UserIcon />
                <span>Account settings</span>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onReset();
                }}
              >
                <LogOutIcon />
                <span>Sign out</span>
              </MenuItem>
            </MenuGroup>
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
