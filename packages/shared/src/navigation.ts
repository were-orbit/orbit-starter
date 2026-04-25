import type { WorkspacePermission } from "./permissions.ts";

/**
 * Icons are referenced by name (string) rather than as React components
 * so this file can live in the framework-free shared package. Each
 * consumer app maps `LucideIconName` to a `lucide-react` component in
 * its own `sidebar/icon.tsx` resolver.
 */
export type LucideIconName =
  | "home"
  | "users"
  | "credit-card"
  | "settings"
  | "sliders"
  | "paintbrush"
  | "user"
  | "shield"
  | "plug"
  | "book"
  | "sparkles";

export type NavLeaf = {
  key: string;
  title: string;
  icon: LucideIconName;
  /**
   * Route segment relative to `/d/{workspaceSlug}`. Empty string means
   * the workspace root (Home). The `__external:` prefix marks a link
   * resolved to an absolute URL by the consumer (docs, changelog).
   */
  segment: string;
  permission?: WorkspacePermission;
};

export type NavGroup = {
  key: string;
  title: string;
  icon: LucideIconName;
  items: NavLeaf[];
};

export type NavItem = NavLeaf | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "items" in item && Array.isArray(item.items);
}

export const navMainItems: NavItem[] = [
  { key: "home", title: "Home", icon: "home", segment: "" },
  {
    key: "settings",
    title: "Settings",
    icon: "settings",
    items: [
      {
        key: "general",
        title: "General",
        icon: "sliders",
        segment: "workspace/settings/general",
      },
      {
        key: "appearance",
        title: "Appearance",
        icon: "paintbrush",
        segment: "workspace/settings/appearance",
      },
      {
        key: "members",
        title: "Members",
        icon: "user",
        segment: "workspace/settings/members",
        permission: "workspace.members.invite",
      },
      {
        key: "roles",
        title: "Roles",
        icon: "shield",
        segment: "workspace/settings/roles",
        permission: "workspace.roles.manage",
      },
      {
        key: "integrations",
        title: "Integrations",
        icon: "plug",
        segment: "workspace/settings/integrations",
      },
    ],
  },
];

export const navFooterItems: NavLeaf[] = [
  { key: "docs", title: "Docs", icon: "book", segment: "__external:docs" },
  {
    key: "changelog",
    title: "Changelog",
    icon: "sparkles",
    segment: "__external:changelog",
  },
];
