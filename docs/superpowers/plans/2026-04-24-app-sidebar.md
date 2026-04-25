# App Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled `AppRail` in `apps/web-tanstack` and `apps/web-next` with a responsive `AppSidebar` built on `@orbit/ui/sidebar`, and introduce real top-level nav destinations (Home, Teams, Billing, Settings).

**Architecture:** Shared `navigation-data.ts` in `@orbit/shared`. Per-app thin `AppSidebar`/`NavMain`/`NavSecondary` components wrap the cross-app `@orbit/ui/sidebar` primitive. Settings becomes a `Collapsible` group; Teams and Billing are promoted to top-level routes (the old `/workspace/settings/teams` and `/workspace/settings/billing` URLs are deleted — the product isn't live yet).

**Tech Stack:** React 19, TanStack Router (web-tanstack), Next 16 App Router (web-next), `@orbit/ui/sidebar` (base-ui + coss ui shape, coss.com/ui), `lucide-react`, Tailwind v4.

**Testing note:** There is no frontend test harness in this repo (API-only vitest per `CLAUDE.md`). Each task verifies with `npm run typecheck` + a manual smoke check at the listed breakpoint. Don't bolt on Vitest for UI components as part of this plan.

**Reference implementation (cal.com):** `https://raw.githubusercontent.com/cosscom/coss/main/apps/examples/calcom/components/app/app-sidebar.tsx` and sibling `nav-main.tsx`, `nav-secondary.tsx`.

---

## File structure overview

### New
- `packages/shared/src/navigation.ts`
- `packages/ui/src/components/ui/sidebar.tsx` — adds `useSidebarMenuOpen` hook + context wire-up
- `apps/web-tanstack/src/components/sidebar/app-sidebar.tsx`
- `apps/web-tanstack/src/components/sidebar/nav-main.tsx`
- `apps/web-tanstack/src/components/sidebar/nav-secondary.tsx`
- `apps/web-tanstack/src/components/sidebar/icon.tsx`
- `apps/web-tanstack/src/pages/workspace-home/home-page.tsx`
- `apps/web-tanstack/src/pages/workspace-teams/workspace-teams-page.tsx` (moved from settings)
- `apps/web-tanstack/src/pages/workspace-billing/workspace-billing-page.tsx` (moved from settings)
- `apps/web-tanstack/src/routes/d/$workspaceSlug/teams.tsx`
- `apps/web-tanstack/src/routes/d/$workspaceSlug/billing.tsx`
- `apps/web-next/src/components/sidebar/app-sidebar.tsx`
- `apps/web-next/src/components/sidebar/nav-main.tsx`
- `apps/web-next/src/components/sidebar/nav-secondary.tsx`
- `apps/web-next/src/components/sidebar/icon.tsx`
- `apps/web-next/src/views/workspace-home/home-page.tsx`
- `apps/web-next/src/views/workspace-teams/workspace-teams-page.tsx` (moved from settings)
- `apps/web-next/src/views/workspace-billing/workspace-billing-page.tsx` (moved from settings)
- `apps/web-next/app/d/[workspaceSlug]/teams/page.tsx`
- `apps/web-next/app/d/[workspaceSlug]/billing/page.tsx`

### Modified
- `packages/shared/src/index.ts` — re-export `./navigation.ts`
- Both apps: `src/components/app-layout.tsx` — render `AppSidebar` + `SidebarInset`
- Both apps: `src/components/app-shell-skeleton.tsx` — mirror new shape
- Both apps: `pages|views/workspace-settings/section-page.tsx` — drop `teams`, `billing` cases
- Both apps: `components/workspace-settings/workspace-settings-shell.tsx` — drop teams + billing from section list
- Both apps: `pages|views/dev-page.tsx` — update any links to old settings/teams or settings/billing
- `apps/web-tanstack/src/components/app-logo.tsx` — any internal settings links retargeted
- `apps/web-tanstack/src/routes/d/$workspaceSlug/index.tsx` — render Home, not redirect
- `apps/web-next/app/d/[workspaceSlug]/page.tsx` — render Home, not redirect

### Deleted
- `apps/web-tanstack/src/components/app-rail.tsx`
- `apps/web-tanstack/src/components/nav-secondary.tsx` (standalone; replaced by `components/sidebar/nav-secondary.tsx`)
- `apps/web-tanstack/src/pages/workspace-settings/teams-page.tsx` (content moved)
- `apps/web-tanstack/src/pages/workspace-settings/teams/` (moved with page)
- `apps/web-tanstack/src/pages/workspace-settings/billing-page.tsx` (content moved)
- `apps/web-next/src/components/app-rail.tsx`
- `apps/web-next/src/components/nav-secondary.tsx`
- `apps/web-next/src/views/workspace-settings/teams-page.tsx` (content moved)
- `apps/web-next/src/views/workspace-settings/teams/` (moved with page)
- `apps/web-next/src/views/workspace-settings/billing-page.tsx` (content moved)
- `apps/web-next/app/d/[workspaceSlug]/workspace/settings/teams/` — none (no dedicated route; rely on `[section]`)
- `apps/web-next/app/d/[workspaceSlug]/workspace/settings/billing/` — none (same)

---

## Task 1: Add `useSidebarMenuOpen` hook to `@orbit/ui/sidebar`

**Files:**
- Modify: `packages/ui/src/components/ui/sidebar.tsx`

Tracks how many nav submenu popups are open in icon-collapsed mode. When `> 0`, `SidebarMenuButton` must suppress its tooltip so it doesn't stack on top of the popup.

- [ ] **Step 1: Add the context + hook**

In `packages/ui/src/components/ui/sidebar.tsx`, add below the existing `SidebarContext` / `useSidebar` block (around line 105):

```tsx
type SidebarMenuOpenContextValue = {
  hasOpenMenu: boolean;
  registerMenu: () => () => void;
};

const SidebarMenuOpenContext =
  React.createContext<SidebarMenuOpenContextValue | null>(null);

export function useSidebarMenuOpen(): SidebarMenuOpenContextValue {
  const ctx = React.useContext(SidebarMenuOpenContext);
  if (!ctx) {
    return {
      hasOpenMenu: false,
      registerMenu: () => () => {},
    };
  }
  return ctx;
}

function SidebarMenuOpenProvider({
  children,
}: { children: React.ReactNode }): React.ReactElement {
  const [openCount, setOpenCount] = React.useState(0);
  const registerMenu = React.useCallback((): (() => void) => {
    setOpenCount((n) => n + 1);
    return () => setOpenCount((n) => Math.max(0, n - 1));
  }, []);
  const value = React.useMemo<SidebarMenuOpenContextValue>(
    () => ({ hasOpenMenu: openCount > 0, registerMenu }),
    [openCount, registerMenu],
  );
  return (
    <SidebarMenuOpenContext.Provider value={value}>
      {children}
    </SidebarMenuOpenContext.Provider>
  );
}
```

- [ ] **Step 2: Wrap `SidebarProvider`'s children with the new provider**

In the `SidebarProvider` function, change the returned JSX so the menu-open provider wraps `children`:

```tsx
  return (
    <SidebarContext.Provider value={contextValue}>
      <SidebarMenuOpenProvider>
        <div
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
            className,
          )}
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </div>
      </SidebarMenuOpenProvider>
    </SidebarContext.Provider>
  );
```

- [ ] **Step 3: Teach `SidebarMenuButton` to hide its tooltip when a popup is open**

In `SidebarMenuButton` (around line 562), read the hook and add `hasOpenMenu` to the `hidden` prop of the `TooltipPopup`:

```tsx
export function SidebarMenuButton({
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & {
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipPopup>;
} & VariantProps<typeof sidebarMenuButtonVariants>): React.ReactElement {
  const { isMobile, state } = useSidebar();
  const { hasOpenMenu } = useSidebarMenuOpen();

  // ... existing body until the return with Tooltip ...

  return (
    <Tooltip>
      <TooltipTrigger
        render={buttonElement as React.ReactElement<Record<string, unknown>>}
      />
      <TooltipPopup
        align="center"
        hidden={state !== "collapsed" || isMobile || hasOpenMenu}
        side="right"
        {...tooltip}
      />
    </Tooltip>
  );
}
```

- [ ] **Step 4: Typecheck the ui package**

Run: `npm run typecheck --workspace @orbit/ui`
Expected: exit 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/ui/sidebar.tsx
git commit -m "feat(ui): add useSidebarMenuOpen hook to sidebar primitive"
```

---

## Task 2: Shared navigation data in `@orbit/shared`

**Files:**
- Create: `packages/shared/src/navigation.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/navigation.ts`**

```ts
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
```

- [ ] **Step 2: Re-export from `packages/shared/src/index.ts`**

```ts
export * from "./ids.ts";
export * from "./dto.ts";
export * from "./permissions.ts";
export * from "./realtime.ts";
export * from "./themes.ts";
export * from "./navigation.ts";
```

- [ ] **Step 3: Typecheck shared**

Run: `npm run typecheck --workspace @orbit/shared`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/navigation.ts packages/shared/src/index.ts
git commit -m "feat(shared): add navigation data for workspace sidebar"
```

---

## Task 3: Icon resolvers (both apps)

**Files:**
- Create: `apps/web-tanstack/src/components/sidebar/icon.tsx`
- Create: `apps/web-next/src/components/sidebar/icon.tsx`

Each resolver maps `LucideIconName` (from `@orbit/shared`) to a `lucide-react` icon component. Identical content in both apps; kept per-app so tree-shaking stays per-app.

- [ ] **Step 1: Write `apps/web-tanstack/src/components/sidebar/icon.tsx`**

```tsx
import type { LucideIconName } from "@orbit/shared/navigation";
import {
  BookIcon,
  CreditCardIcon,
  HomeIcon,
  type LucideIcon,
  PaintbrushIcon,
  PlugIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

const ICONS: Record<LucideIconName, LucideIcon> = {
  home: HomeIcon,
  users: UsersIcon,
  "credit-card": CreditCardIcon,
  settings: SettingsIcon,
  sliders: SlidersIcon,
  paintbrush: PaintbrushIcon,
  user: UserIcon,
  shield: ShieldIcon,
  plug: PlugIcon,
  book: BookIcon,
  sparkles: SparklesIcon,
};

export function NavIcon({
  name,
  className,
}: {
  name: LucideIconName;
  className?: string;
}): React.ReactElement {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
```

- [ ] **Step 2: Write `apps/web-next/src/components/sidebar/icon.tsx`**

Same content as step 1, prefixed with `"use client";`:

```tsx
"use client";

import type { LucideIconName } from "@orbit/shared/navigation";
import {
  BookIcon,
  CreditCardIcon,
  HomeIcon,
  type LucideIcon,
  PaintbrushIcon,
  PlugIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

const ICONS: Record<LucideIconName, LucideIcon> = {
  home: HomeIcon,
  users: UsersIcon,
  "credit-card": CreditCardIcon,
  settings: SettingsIcon,
  sliders: SlidersIcon,
  paintbrush: PaintbrushIcon,
  user: UserIcon,
  shield: ShieldIcon,
  plug: PlugIcon,
  book: BookIcon,
  sparkles: SparklesIcon,
};

export function NavIcon({
  name,
  className,
}: {
  name: LucideIconName;
  className?: string;
}): React.ReactElement {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
```

- [ ] **Step 3: Typecheck both apps**

Run: `npm run typecheck --workspace @orbit/web-tanstack && npm run typecheck --workspace @orbit/web-next`
Expected: exit 0. (Components aren't wired yet; no usage errors expected.)

- [ ] **Step 4: Commit**

```bash
git add apps/web-tanstack/src/components/sidebar/icon.tsx apps/web-next/src/components/sidebar/icon.tsx
git commit -m "feat(web): add lucide icon resolver for sidebar nav"
```

---

## Task 4: `NavMain` + `NavSecondary` in web-tanstack

**Files:**
- Create: `apps/web-tanstack/src/components/sidebar/nav-main.tsx`
- Create: `apps/web-tanstack/src/components/sidebar/nav-secondary.tsx`

- [ ] **Step 1: Write `NavMain`**

`apps/web-tanstack/src/components/sidebar/nav-main.tsx`:

```tsx
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
import { useMediaQuery } from "@orbit/ui/hooks/use-media-query";
import { Link, useParams, useRouterState } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "./icon";
import { useCan } from "@/lib/permissions";

function useActiveSegment(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}

function isLeafActive(pathname: string, slug: string, leaf: NavLeaf): boolean {
  if (leaf.segment === "") return pathname === `/d/${slug}`;
  return pathname.startsWith(`/d/${slug}/${leaf.segment}`);
}

function Leaf({ item, slug }: { item: NavLeaf; slug: string }) {
  const pathname = useActiveSegment();
  const isIconMode = useMediaQuery("md:max-lg");
  const allowed = usePermissionGate(item.permission);
  if (!allowed) return null;
  const active = isLeafActive(pathname, slug, item);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        render={
          <Link
            to="/d/$workspaceSlug"
            params={{ workspaceSlug: slug }}
            search={{}}
          />
        }
        tooltip={isIconMode ? item.title : undefined}
      >
        <NavIcon name={item.icon} className="size-4" />
        <span className="max-lg:sr-only">{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function Group({ item, slug }: { item: NavGroup; slug: string }) {
  const pathname = useActiveSegment();
  const isIconMode = useMediaQuery("md:max-lg");
  const { registerMenu } = useSidebarMenuOpen();
  const { state } = useSidebar();

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

  return (
    <SidebarMenuItem>
      {/* Icon-mode: Menu popup */}
      <Menu
        onOpenChange={(open) => {
          if (open) unregisterRef.current = registerMenu();
          else {
            unregisterRef.current?.();
            unregisterRef.current = null;
          }
        }}
      >
        <div className="hidden md:max-lg:block">
          <SidebarMenuButton
            aria-label={item.title}
            isActive={active}
            render={<MenuTrigger />}
            tooltip={isIconMode ? item.title : undefined}
          >
            <NavIcon name={item.icon} className="size-4" />
          </SidebarMenuButton>
        </div>
        <MenuPopup align="start" alignOffset={0} side="right">
          <MenuGroup>
            <MenuGroupLabel>{item.title}</MenuGroupLabel>
            {visibleChildren.map((child) => (
              <MenuItem
                key={child.key}
                render={
                  <Link
                    to={`/d/$workspaceSlug/${child.segment}` as "/d/$workspaceSlug"}
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

      {/* Expanded mode: Collapsible */}
      <Collapsible
        open={expanded}
        onOpenChange={setExpanded}
        data-state={expanded ? "open" : "closed"}
      >
        <CollapsibleTrigger
          className="justify-between max-lg:hidden"
          render={
            <SidebarMenuButton
              tooltip={state === "collapsed" ? item.title : undefined}
            />
          }
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
                      to={`/d/$workspaceSlug/${child.segment}` as "/d/$workspaceSlug"}
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

// Hooks cannot be called conditionally inside .filter(), so we gate
// children up-front via a fixed-call-order helper.
function useVisibleChildren(items: NavLeaf[]): NavLeaf[] {
  // Permissions are declared statically per-item, so call useCan in a stable
  // order once per item index.
  return items
    .map((item) => ({ item, allowed: usePermissionGate(item.permission) }))
    .filter((x) => x.allowed)
    .map((x) => x.item);
}

function usePermissionGate(permission: NavLeaf["permission"]): boolean {
  // Hook order is stable because `permission` is static per render tree.
  // When absent, always allowed.
  if (!permission) return true;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCan(permission);
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
```

Note: TanStack Router's typed `to` prop requires a registered route string, which is why `teams`/`billing` segments (created in Tasks 9/10) will be type-checked once those routes exist. The cast `as "/d/$workspaceSlug"` is a deliberate escape hatch for the dynamic segment approach; revisit once all top-level routes are declared if stricter typing is desired.

- [ ] **Step 2: Write `NavSecondary`**

`apps/web-tanstack/src/components/sidebar/nav-secondary.tsx`:

```tsx
import { navFooterItems } from "@orbit/shared/navigation";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@orbit/ui/sidebar";
import { useMediaQuery } from "@orbit/ui/hooks/use-media-query";
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
  const isIconMode = useMediaQuery("md:max-lg");
  return (
    <SidebarGroup {...props}>
      <SidebarMenu className="gap-0.5">
        {navFooterItems.map((item) => (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton
              render={
                <a href={resolveHref(item.segment)} rel="noreferrer" target="_blank" />
              }
              tooltip={isIconMode ? item.title : undefined}
            >
              <NavIcon name={item.icon} className="size-4" />
              <span className="max-lg:sr-only">{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
```

- [ ] **Step 3: Typecheck web-tanstack**

Run: `npm run typecheck --workspace @orbit/web-tanstack`
Expected: may surface errors about `NavIcon` usage or `Link` typing of `teams`/`billing` — if so, in Task 9/10 these resolve once the routes exist. To unblock typecheck now, temporarily cast with `as any` on the `Link.to` only in `Group`'s children mapping. Do NOT commit `as any`; remove it in Task 10.

- [ ] **Step 4: Commit**

```bash
git add apps/web-tanstack/src/components/sidebar/nav-main.tsx apps/web-tanstack/src/components/sidebar/nav-secondary.tsx
git commit -m "feat(web-tanstack): add NavMain + NavSecondary sidebar components"
```

---

## Task 5: `NavMain` + `NavSecondary` in web-next

**Files:**
- Create: `apps/web-next/src/components/sidebar/nav-main.tsx`
- Create: `apps/web-next/src/components/sidebar/nav-secondary.tsx`

- [ ] **Step 1: Write `NavMain`**

`apps/web-next/src/components/sidebar/nav-main.tsx`:

```tsx
"use client";

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
import { useMediaQuery } from "@orbit/ui/hooks/use-media-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "./icon";
import { useCan } from "@/lib/permissions";

function isLeafActive(pathname: string, slug: string, leaf: NavLeaf): boolean {
  if (leaf.segment === "") return pathname === `/d/${slug}`;
  return pathname.startsWith(`/d/${slug}/${leaf.segment}`);
}

function href(slug: string, segment: string): string {
  return segment === "" ? `/d/${slug}` : `/d/${slug}/${segment}`;
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
  const pathname = usePathname();
  const isIconMode = useMediaQuery("md:max-lg");
  const allowed = usePermissionGate(item.permission);
  if (!allowed) return null;
  const active = isLeafActive(pathname, slug, item);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        render={<Link href={href(slug, item.segment)} />}
        tooltip={isIconMode ? item.title : undefined}
      >
        <NavIcon name={item.icon} className="size-4" />
        <span className="max-lg:sr-only">{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function Group({ item, slug }: { item: NavGroup; slug: string }) {
  const pathname = usePathname();
  const isIconMode = useMediaQuery("md:max-lg");
  const { registerMenu } = useSidebarMenuOpen();
  const { state } = useSidebar();
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
        <div className="hidden md:max-lg:block">
          <SidebarMenuButton
            aria-label={item.title}
            isActive={active}
            render={<MenuTrigger />}
            tooltip={isIconMode ? item.title : undefined}
          >
            <NavIcon name={item.icon} className="size-4" />
          </SidebarMenuButton>
        </div>
        <MenuPopup align="start" alignOffset={0} side="right">
          <MenuGroup>
            <MenuGroupLabel>{item.title}</MenuGroupLabel>
            {visibleChildren.map((child) => (
              <MenuItem
                key={child.key}
                render={<Link href={href(slug, child.segment)} />}
              >
                <span>{child.title}</span>
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuPopup>
      </Menu>

      <Collapsible
        open={expanded}
        onOpenChange={setExpanded}
        data-state={expanded ? "open" : "closed"}
      >
        <CollapsibleTrigger
          className="justify-between max-lg:hidden"
          render={
            <SidebarMenuButton
              tooltip={state === "collapsed" ? item.title : undefined}
            />
          }
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
                  render={<Link href={href(slug, child.segment)} />}
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
```

- [ ] **Step 2: Write `NavSecondary`**

`apps/web-next/src/components/sidebar/nav-secondary.tsx`:

```tsx
"use client";

import { navFooterItems } from "@orbit/shared/navigation";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@orbit/ui/sidebar";
import { useMediaQuery } from "@orbit/ui/hooks/use-media-query";
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
  const isIconMode = useMediaQuery("md:max-lg");
  return (
    <SidebarGroup {...props}>
      <SidebarMenu className="gap-0.5">
        {navFooterItems.map((item) => (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton
              render={<a href={resolveHref(item.segment)} rel="noreferrer" target="_blank" />}
              tooltip={isIconMode ? item.title : undefined}
            >
              <NavIcon name={item.icon} className="size-4" />
              <span className="max-lg:sr-only">{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
```

- [ ] **Step 3: Typecheck web-next**

Run: `npm run typecheck --workspace @orbit/web-next`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web-next/src/components/sidebar/nav-main.tsx apps/web-next/src/components/sidebar/nav-secondary.tsx
git commit -m "feat(web-next): add NavMain + NavSecondary sidebar components"
```

---

## Task 6: `AppSidebar` shell (both apps)

**Files:**
- Create: `apps/web-tanstack/src/components/sidebar/app-sidebar.tsx`
- Create: `apps/web-next/src/components/sidebar/app-sidebar.tsx`

- [ ] **Step 1: Write tanstack `AppSidebar`**

`apps/web-tanstack/src/components/sidebar/app-sidebar.tsx`:

```tsx
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
```

- [ ] **Step 2: Write web-next `AppSidebar`**

`apps/web-next/src/components/sidebar/app-sidebar.tsx`:

```tsx
"use client";

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
```

- [ ] **Step 3: Typecheck both apps**

Run: `npm run typecheck --workspaces --if-present`
Expected: exit 0 (ignore the tanstack `Link.to` cast warnings if present; Tasks 9/10 resolve them).

- [ ] **Step 4: Commit**

```bash
git add apps/web-tanstack/src/components/sidebar/app-sidebar.tsx apps/web-next/src/components/sidebar/app-sidebar.tsx
git commit -m "feat(web): add AppSidebar shell wrapping ui/sidebar primitives"
```

---

## Task 7: Wire `AppSidebar` into `AppLayout` and delete `AppRail` (both apps)

**Files:**
- Modify: `apps/web-tanstack/src/components/app-layout.tsx`
- Modify: `apps/web-next/src/components/app-layout.tsx`
- Delete: `apps/web-tanstack/src/components/app-rail.tsx`
- Delete: `apps/web-next/src/components/app-rail.tsx`
- Delete: `apps/web-tanstack/src/components/nav-secondary.tsx` (old standalone variant)

- [ ] **Step 1: Rewrite `apps/web-tanstack/src/components/app-layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@orbit/ui/sidebar";
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
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Rewrite `apps/web-next/src/components/app-layout.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@orbit/ui/sidebar";
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
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 3: Delete old files**

```bash
git rm apps/web-tanstack/src/components/app-rail.tsx
git rm apps/web-next/src/components/app-rail.tsx
git rm apps/web-tanstack/src/components/nav-secondary.tsx
```

(Check first whether web-next also has a standalone `nav-secondary.tsx` — if so, `git rm` it too.)

- [ ] **Step 4: Typecheck + dev smoke**

Run: `npm run typecheck`
Expected: exit 0.

Then `npm run dev` and load `http://localhost:4001/d/<any slug>` and `http://localhost:4003/d/<any slug>`. Verify: sidebar renders, shows Home / Teams / Billing / Settings, `⌘B` toggles expanded ↔ collapsed, tooltips appear in collapsed mode, mobile sheet appears below `md`. Navigating to Teams and Billing will 404 right now — that's expected; Tasks 9/10 create the routes.

- [ ] **Step 5: Commit**

```bash
git add apps/web-tanstack/src/components/app-layout.tsx apps/web-next/src/components/app-layout.tsx
git commit -m "feat(web): replace AppRail with AppSidebar"
```

---

## Task 8: Workspace Home page (both apps)

**Files:**
- Create: `apps/web-tanstack/src/pages/workspace-home/home-page.tsx`
- Create: `apps/web-next/src/views/workspace-home/home-page.tsx`
- Modify: `apps/web-tanstack/src/routes/d/$workspaceSlug/index.tsx`
- Modify: `apps/web-next/app/d/[workspaceSlug]/page.tsx`

- [ ] **Step 1: Write the shared-looking home page content (tanstack)**

`apps/web-tanstack/src/pages/workspace-home/home-page.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@orbit/ui/card";
import { Button } from "@orbit/ui/button";
import { Link } from "@tanstack/react-router";
import { useWorkspaceSlug } from "@/lib/use-workspace-slug";

export function WorkspaceHomePage(): React.ReactElement {
  const slug = useWorkspaceSlug() ?? "";
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          This is your workspace home. Jump into what you were working on.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Organize people into teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link to="/d/$workspaceSlug/teams" params={{ workspaceSlug: slug }}>
                  Open teams
                </Link>
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your plan and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link to="/d/$workspaceSlug/billing" params={{ workspaceSlug: slug }}>
                  Open billing
                </Link>
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Workspace-wide configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  to="/d/$workspaceSlug/workspace/settings/$section"
                  params={{ workspaceSlug: slug, section: "general" }}
                >
                  Open settings
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite tanstack `/d/$workspaceSlug/index.tsx` to render the home page**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceHomePage } from "@/pages/workspace-home/home-page";

export const Route = createFileRoute("/d/$workspaceSlug/")({
  component: WorkspaceHomePage,
});
```

- [ ] **Step 3: Write the web-next home page**

`apps/web-next/src/views/workspace-home/home-page.tsx`:

```tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@orbit/ui/card";
import { Button } from "@orbit/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";

export function WorkspaceHomePage(): React.ReactElement {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const slug = workspaceSlug ?? "";
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          This is your workspace home. Jump into what you were working on.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Organize people into teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/d/${slug}/teams`}>Open teams</Link>}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your plan and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/d/${slug}/billing`}>Open billing</Link>}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Workspace-wide configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={`/d/${slug}/workspace/settings/general`}>
                  Open settings
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite web-next `/app/d/[workspaceSlug]/page.tsx`**

```tsx
import { WorkspaceHomePage } from "@/views/workspace-home/home-page";

export default function WorkspaceIndexPage() {
  return <WorkspaceHomePage />;
}
```

- [ ] **Step 5: Typecheck + smoke**

Run: `npm run typecheck`
Expected: exit 0.

Dev: navigate to `/d/<slug>` in both apps. Home page renders. Clicking "Open teams" / "Open billing" 404s (expected until Tasks 9/10).

- [ ] **Step 6: Commit**

```bash
git add apps/web-tanstack/src/pages/workspace-home apps/web-next/src/views/workspace-home apps/web-tanstack/src/routes/d/\$workspaceSlug/index.tsx apps/web-next/app/d/\[workspaceSlug\]/page.tsx
git commit -m "feat(web): add workspace home page (replaces settings redirect)"
```

---

## Task 9: Promote Teams to top-level (both apps)

**Files:**
- Create: `apps/web-tanstack/src/pages/workspace-teams/workspace-teams-page.tsx`
- Create: `apps/web-tanstack/src/routes/d/$workspaceSlug/teams.tsx`
- Delete: `apps/web-tanstack/src/pages/workspace-settings/teams-page.tsx`
- Delete: `apps/web-tanstack/src/pages/workspace-settings/teams/` (if it contains sub-components used only by the page)
- Create: `apps/web-next/src/views/workspace-teams/workspace-teams-page.tsx`
- Create: `apps/web-next/app/d/[workspaceSlug]/teams/page.tsx`
- Delete: `apps/web-next/src/views/workspace-settings/teams-page.tsx`
- Delete: `apps/web-next/src/views/workspace-settings/teams/`
- Modify: both apps' `section-page.tsx` — drop `teams` case

- [ ] **Step 1: Move the tanstack teams page**

```bash
git mv apps/web-tanstack/src/pages/workspace-settings/teams-page.tsx \
       apps/web-tanstack/src/pages/workspace-teams/workspace-teams-page.tsx
git mv apps/web-tanstack/src/pages/workspace-settings/teams \
       apps/web-tanstack/src/pages/workspace-teams/teams
```

Open `workspace-teams-page.tsx` and rename the export if it references the old path:

```tsx
// change any `WorkspaceTeamsPage` export/identifier references to match the new location.
// If the file imports from `./teams/...`, those relative imports stay correct after the move.
```

- [ ] **Step 2: Add the tanstack route file**

`apps/web-tanstack/src/routes/d/$workspaceSlug/teams.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceTeamsPage } from "@/pages/workspace-teams/workspace-teams-page";

export const Route = createFileRoute("/d/$workspaceSlug/teams")({
  component: WorkspaceTeamsPage,
});
```

- [ ] **Step 3: Drop `teams` from tanstack `section-page.tsx`**

Remove the `+feature:teams` block:

```tsx
// apps/web-tanstack/src/pages/workspace-settings/section-page.tsx
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
```

- [ ] **Step 4: Do the same for web-next**

```bash
git mv apps/web-next/src/views/workspace-settings/teams-page.tsx \
       apps/web-next/src/views/workspace-teams/workspace-teams-page.tsx
git mv apps/web-next/src/views/workspace-settings/teams \
       apps/web-next/src/views/workspace-teams/teams
```

Create `apps/web-next/app/d/[workspaceSlug]/teams/page.tsx`:

```tsx
import { WorkspaceTeamsPage } from "@/views/workspace-teams/workspace-teams-page";

export default function Page() {
  return <WorkspaceTeamsPage />;
}
```

Drop `teams` from `apps/web-next/src/views/workspace-settings/section-page.tsx` exactly as in Step 3.

- [ ] **Step 5: Regenerate tanstack route tree**

The tanstack dev server regenerates `routeTree.gen.ts` on the fly. If it's stale, run the build once to force regeneration:

```bash
npm run build --workspace @orbit/web-tanstack
```

Or simpler: start `npm run dev:web` once and let the plugin regenerate.

- [ ] **Step 6: Typecheck + smoke**

Run: `npm run typecheck`
Expected: exit 0. (If `NavMain` had an `as any` cast from Task 4, remove it now — the `/d/$workspaceSlug/teams` route is registered.)

Dev: navigate to `/d/<slug>/teams` in both apps. Old teams page content renders under the new URL.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(web): promote Teams to top-level workspace route"
```

---

## Task 10: Promote Billing to top-level (both apps)

**Files:**
- Create: `apps/web-tanstack/src/pages/workspace-billing/workspace-billing-page.tsx` (moved)
- Create: `apps/web-tanstack/src/routes/d/$workspaceSlug/billing.tsx`
- Delete: `apps/web-tanstack/src/pages/workspace-settings/billing-page.tsx`
- Create: `apps/web-next/src/views/workspace-billing/workspace-billing-page.tsx` (moved)
- Create: `apps/web-next/app/d/[workspaceSlug]/billing/page.tsx`
- Delete: `apps/web-next/src/views/workspace-settings/billing-page.tsx`
- Modify: both apps' `section-page.tsx` — drop `billing` case
- Modify: both apps' billing page — update Stripe `successUrl`

- [ ] **Step 1: Move the tanstack billing page**

```bash
git mv apps/web-tanstack/src/pages/workspace-settings/billing-page.tsx \
       apps/web-tanstack/src/pages/workspace-billing/workspace-billing-page.tsx
```

- [ ] **Step 2: Update `successUrl` inside the moved file**

Open `apps/web-tanstack/src/pages/workspace-billing/workspace-billing-page.tsx`, find:

```tsx
successUrl: `${window.location.origin}/d/${workspaceSlug}/workspace/settings/billing`,
```

Change to:

```tsx
successUrl: `${window.location.origin}/d/${workspaceSlug}/billing`,
```

If the exported symbol name is `WorkspaceBillingPage`, leave it alone. If it was something settings-specific, keep it but update the export name to reflect the new location if you prefer.

- [ ] **Step 3: Add the tanstack route**

`apps/web-tanstack/src/routes/d/$workspaceSlug/billing.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceBillingPage } from "@/pages/workspace-billing/workspace-billing-page";

export const Route = createFileRoute("/d/$workspaceSlug/billing")({
  component: WorkspaceBillingPage,
});
```

- [ ] **Step 4: Drop `billing` from tanstack `section-page.tsx`**

Final content of `apps/web-tanstack/src/pages/workspace-settings/section-page.tsx`:

```tsx
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
```

- [ ] **Step 5: Do the same for web-next**

```bash
git mv apps/web-next/src/views/workspace-settings/billing-page.tsx \
       apps/web-next/src/views/workspace-billing/workspace-billing-page.tsx
```

Update `successUrl` in the moved file (same edit as Step 2).

Create `apps/web-next/app/d/[workspaceSlug]/billing/page.tsx`:

```tsx
import { WorkspaceBillingPage } from "@/views/workspace-billing/workspace-billing-page";

export default function Page() {
  return <WorkspaceBillingPage />;
}
```

Apply the same section-page edit to `apps/web-next/src/views/workspace-settings/section-page.tsx`.

- [ ] **Step 6: Typecheck + smoke**

Run: `npm run typecheck`
Expected: exit 0.

Dev: navigate to `/d/<slug>/billing` in both apps. The old billing page content renders. Starting a checkout in dev (against a test Stripe account) lands back on `/d/<slug>/billing` post-success.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(web): promote Billing to top-level and fix Stripe successUrl"
```

---

## Task 11: Update in-page settings shell (both apps)

**Files:**
- Modify: `apps/web-tanstack/src/components/workspace-settings/workspace-settings-shell.tsx`
- Modify: `apps/web-next/src/components/workspace-settings/workspace-settings-shell.tsx`

Drop the `teams` and `billing` items from the settings tabbed/segmented nav inside the canvas, since they're now top-level sidebar destinations.

- [ ] **Step 1: Edit the tanstack shell**

Open `apps/web-tanstack/src/components/workspace-settings/workspace-settings-shell.tsx` and find the section list (usually `const SECTIONS = [...]`):

```tsx
// Before
const SECTIONS = [
  { segment: "general", label: "General" },
  { segment: "appearance", label: "Appearance" },
  { segment: "members", label: "Members" },
  { segment: "roles", label: "Roles" },
  { segment: "teams", label: "Teams" },
  { segment: "billing", label: "Billing" },
  { segment: "integrations", label: "Integrations" },
];

// After
const SECTIONS = [
  { segment: "general", label: "General" },
  { segment: "appearance", label: "Appearance" },
  { segment: "members", label: "Members" },
  { segment: "roles", label: "Roles" },
  { segment: "integrations", label: "Integrations" },
];
```

- [ ] **Step 2: Apply the same edit to the web-next shell**

Open `apps/web-next/src/components/workspace-settings/workspace-settings-shell.tsx` and remove the same two entries.

- [ ] **Step 3: Typecheck + smoke**

Run: `npm run typecheck`
Expected: exit 0.

Dev: visit `/d/<slug>/workspace/settings/general`. The in-canvas section nav shows General / Appearance / Members / Roles / Integrations (no Teams, no Billing). Teams and Billing remain reachable from the sidebar.

- [ ] **Step 4: Commit**

```bash
git add apps/web-tanstack/src/components/workspace-settings/workspace-settings-shell.tsx apps/web-next/src/components/workspace-settings/workspace-settings-shell.tsx
git commit -m "feat(web): drop teams + billing from settings sub-nav"
```

---

## Task 12: Update stale links + app-shell-skeleton (both apps)

**Files:**
- Modify: `apps/web-tanstack/src/pages/dev-page.tsx`
- Modify: `apps/web-next/src/views/dev-page.tsx`
- Modify: `apps/web-tanstack/src/components/app-logo.tsx` (if it links to settings/billing or settings/teams)
- Modify: `apps/web-tanstack/src/components/app-shell-skeleton.tsx`
- Modify: `apps/web-next/src/components/app-shell-skeleton.tsx`

- [ ] **Step 1: Grep for stale references**

```bash
grep -rn "workspace/settings/billing\|workspace/settings/teams" apps/web-tanstack/src apps/web-next/src apps/web-tanstack/app apps/web-next/app
```

Expected: should now only surface hits in `dev-page.tsx`, `app-logo.tsx`, and possibly the `pages/workspace-settings/teams-page.tsx` / `billing-page.tsx` leftover references. Update each to the new top-level URL:
- `...workspace/settings/billing` → `.../billing`
- `...workspace/settings/teams` → `.../teams`

- [ ] **Step 2: Update `app-shell-skeleton.tsx` in both apps**

Replace the hand-rolled `<aside>` block with a `Sidebar` shell so the skeleton mirrors the real layout. For `apps/web-tanstack/src/components/app-shell-skeleton.tsx`:

```tsx
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
```

For `apps/web-next/src/components/app-shell-skeleton.tsx`, same content prefixed with `"use client";`.

- [ ] **Step 3: Typecheck + final smoke**

Run: `npm run typecheck && npm run build`
Expected: exit 0, both apps build.

Dev smoke pass (foreground `npm run dev`), in both web-tanstack (`:4001`) and web-next (`:4003`):

1. `/d/<slug>` → Home renders.
2. `/d/<slug>/teams` → teams content.
3. `/d/<slug>/billing` → billing content.
4. `/d/<slug>/workspace/settings/general` → settings shell without Teams/Billing in its sub-nav.
5. Click Settings in the sidebar (`lg+`) → collapsible expands with General / Appearance / Members / Roles / Integrations.
6. Resize to `md:max-lg` → sidebar collapses to icons. Hover Settings icon → popup menu appears with all 5 sub-items.
7. `⌘B` toggles expanded ↔ collapsed.
8. Resize to `max-md` → sidebar becomes a sheet; a `SidebarTrigger` in the top bar opens it.
9. Verify the docs and changelog footer links open the www URLs.
10. Log out / switch workspace via the footer `UserMenu`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): update dev-page links and app-shell-skeleton for new sidebar"
```

---

## Self-review notes

- **Spec coverage:**
  - `useSidebarMenuOpen` → Task 1.
  - Shared navigation data → Task 2.
  - Per-app `AppSidebar`/`NavMain`/`NavSecondary` + icon resolver → Tasks 3–6.
  - Shell wiring + `AppRail` deletion → Task 7.
  - Home stub → Task 8.
  - Teams + Billing promotion with no redirects → Tasks 9, 10.
  - Settings sub-nav cleanup → Task 11.
  - Dev-page / app-logo / skeleton cleanup → Task 12.
- **PBAC gating** is enforced via `useCan` inside the per-app `NavMain` (the `usePermissionGate` helper).
- **Missing tests:** deliberate — repo has no frontend test harness; plan uses typecheck + manual smoke per CLAUDE.md guidance.
- **Risks flagged in spec** are acknowledged but not mitigated further in-plan; revisit if the `NavMain` implementations drift.
