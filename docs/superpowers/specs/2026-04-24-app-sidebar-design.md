# App sidebar — design

Date: 2026-04-24
Scope: authenticated workspace shell in `apps/web-tanstack` and `apps/web-next`

## Goal

Replace the hand-rolled 56px `AppRail` with a responsive `AppSidebar`
built on the existing `@orbit/ui/sidebar` primitive (coss ui shape — coss.com/ui,
base-ui wiring). Introduce real top-level nav destinations —
**Home**, **Teams**, **Billing**, **Settings** — and nest the current
settings sub-sections underneath Settings via `Collapsible`. Match
the cal.com reference layout at
`cosscom/coss/apps/examples/calcom/components/app/app-sidebar.tsx`.

The product isn't live yet, so **no redirects from old URLs** — we
remove all references to the old settings/teams and settings/billing
paths and move the content to the new routes.

## Non-goals

- Server-side nav gating beyond today's PBAC. We reuse `useCan()` to
  hide items a user can't access.
- A workspace switcher redesign. Today's `AppLogo` keeps its current
  popover; it just lives inside `SidebarHeader` now.
- Nav data sharing at the route-object level. Routes stay declared
  per-app (TanStack file-based vs. Next App Router); only the
  abstract nav list is shared.

## Architecture

### Navigation data

Single declarative list, shared between both apps:

```ts
// packages/shared/src/navigation.ts
export type NavLeaf = {
  key: string;
  title: string;
  icon: LucideIconName; // string enum; each app resolves to lucide-react
  segment: string;      // relative to /d/{slug}
  permission?: WorkspacePermission;
};
export type NavGroup = {
  key: string;
  title: string;
  icon: LucideIconName;
  items: NavLeaf[];
};
export type NavItem = NavLeaf | NavGroup;

export const navMainItems: NavItem[] = [
  { key: "home",     title: "Home",     icon: "home",        segment: "" },
  { key: "teams",    title: "Teams",    icon: "users",       segment: "teams" },
  { key: "billing",  title: "Billing",  icon: "credit-card", segment: "billing",
    permission: "workspace.billing.view" },
  { key: "settings", title: "Settings", icon: "settings",    items: [
    { key: "general",      title: "General",      icon: "sliders",    segment: "workspace/settings/general" },
    { key: "appearance",   title: "Appearance",   icon: "paintbrush", segment: "workspace/settings/appearance" },
    { key: "members",      title: "Members",      icon: "user",       segment: "workspace/settings/members" },
    { key: "roles",        title: "Roles",        icon: "shield",     segment: "workspace/settings/roles",
      permission: "workspace.roles.manage" },
    { key: "integrations", title: "Integrations", icon: "plug",       segment: "workspace/settings/integrations" },
  ]},
];

export const navFooterItems: NavLeaf[] = [
  { key: "docs",      title: "Docs",      icon: "book",       segment: "__external:docs" },
  { key: "changelog", title: "Changelog", icon: "sparkles",   segment: "__external:changelog" },
];
```

Keeping this in `@orbit/shared` means the nav vocabulary lives with
the domain permissions it guards on. Icons are declared as a string
enum that both apps resolve to `lucide-react`; this avoids pulling
React into `packages/shared`.

External footer items use an `__external:` prefix resolved per-app to
`WWW_URL + "/docs"` / `WWW_URL + "/changelog"`.

### Per-app components

Because each app has its own `Link` primitive and its own
path-matching hook, `NavMain` and `NavSecondary` are small per-app
wrappers around the shared `@orbit/ui/sidebar` primitives:

```
apps/web-tanstack/src/components/sidebar/
  app-sidebar.tsx      — <Sidebar> shell
  nav-main.tsx         — renders navMainItems; Collapsible (expanded) + Menu popup (icon mode)
  nav-secondary.tsx    — renders navFooterItems
  icon.tsx             — resolves LucideIconName → component
apps/web-next/src/components/sidebar/
  app-sidebar.tsx
  nav-main.tsx
  nav-secondary.tsx
  icon.tsx
```

Logic is duplicated intentionally: the two implementations are small
(~120 lines each) and deviating `Link`/router APIs make abstraction
costly. The shared piece is the data, which is where the real
coupling risk lives.

### Shell composition

Both apps' `AppLayout` becomes:

```tsx
<SidebarProvider className="flex h-svh min-h-svh overflow-hidden">
  <AppSidebar ws={ws} onReset={onReset} />
  <SidebarInset>{children}</SidebarInset>
</SidebarProvider>
```

`AppSidebar`:

```tsx
<Sidebar collapsible="icon" variant="sidebar">
  <SidebarHeader>   <AppLogo ws={ws} /> </SidebarHeader>
  <SidebarContent>
    <NavMain items={navMainItems} />
    <NavSecondary className="mt-auto" items={navFooterItems} />
  </SidebarContent>
  <SidebarFooter>   <UserMenu ws={ws} onReset={onReset} /> </SidebarFooter>
</Sidebar>
```

### Breakpoint behavior

Driven by `@orbit/ui`'s existing sidebar state:

- **`lg+`** — expanded (`SIDEBAR_WIDTH = 16rem`); groups render as inline
  `Collapsible` with sub-items nested.
- **`md:max-lg`** — icon-only (`SIDEBAR_WIDTH_ICON = 3rem`); groups render
  as a base-ui `Menu` popup triggered from the icon. Leaf items show
  tooltips on hover.
- **`max-md`** — `Sheet` drawer via `SidebarProvider` mobile branch; a
  `SidebarTrigger` mounts in the canvas top bar.

### New primitive: `useSidebarMenuOpen`

Added to `packages/ui/src/components/ui/sidebar.tsx`. Coordinates
open-popup tracking so tooltips don't flicker when a nav submenu is
open in icon mode. Shape matches cal.com's hook:

```ts
export function useSidebarMenuOpen(): {
  hasOpenMenu: boolean;
  registerMenu: () => () => void; // returns unregister
};
```

Implementation: context + ref counter; `SidebarProvider` provides,
`SidebarMenuButton` consumes to suppress its tooltip when
`hasOpenMenu` is true.

### PBAC gating

Each `NavLeaf` optionally declares a `permission`. `NavMain` /
`NavSecondary` filter items using `useCan()` (tanstack) /
`useCan()` (next) before rendering. Hidden items don't count toward
active-state matching.

## Route changes

### Removed (no redirects — app isn't live)

- `/d/{slug}/workspace/settings/teams` (and its sub-pages under
  `pages/workspace-settings/teams/`)
- `/d/{slug}/workspace/settings/billing`
- `teams` and `billing` cases from `section-page.tsx` in both apps.

All code references to these paths are removed (grep in scope: source
dirs under `apps/*/src`, excluding `.output`, `.next`, and
`routeTree.gen.ts` which regenerates).

### Added (per app)

- `/d/{slug}` — Home (existing index route; replaces the redirect to
  settings/general with a real landing stub component
  `WorkspaceHomePage`).
- `/d/{slug}/teams` — top-level Teams page. Same content that used to
  live at settings/teams (moved, not copied).
- `/d/{slug}/billing` — top-level Billing page. Same content that
  used to live at settings/billing. Updates the Stripe `successUrl`
  in `billing-page.tsx` to point at `/d/{slug}/billing`.

### Kept

- `/d/{slug}/workspace/settings/{general,appearance,members,roles,integrations}` — unchanged.
- `/d/{slug}/workspace/settings` (route.tsx) — still redirects to
  `general` when hit directly.
- `/d/{slug}/dev` — unchanged.

## Files touched

### New
- `packages/shared/src/navigation.ts`
- `packages/shared/src/index.ts` — re-export
- `packages/ui/src/components/ui/sidebar.tsx` — add `useSidebarMenuOpen`
- `apps/web-tanstack/src/components/sidebar/{app-sidebar,nav-main,nav-secondary,icon}.tsx`
- `apps/web-tanstack/src/pages/workspace-home/home-page.tsx`
- `apps/web-tanstack/src/routes/d/$workspaceSlug/teams.tsx`
- `apps/web-tanstack/src/routes/d/$workspaceSlug/billing.tsx`
- `apps/web-next/src/components/sidebar/{app-sidebar,nav-main,nav-secondary,icon}.tsx`
- `apps/web-next/src/views/workspace-home/home-page.tsx`
- `apps/web-next/app/d/[workspaceSlug]/teams/page.tsx`
- `apps/web-next/app/d/[workspaceSlug]/billing/page.tsx`

### Modified
- Both apps: `components/app-layout.tsx` — uses `AppSidebar` + `SidebarInset`
- Both apps: `components/app-shell-skeleton.tsx` — mirror new shape
- Both apps: `pages|views/workspace-settings/section-page.tsx` — drop teams + billing cases
- Both apps: `pages|views/workspace-settings/teams-page.tsx` — move content to workspace-teams page
- Both apps: `pages|views/workspace-settings/billing-page.tsx` — move content, fix successUrl
- Both apps: settings shell component (`workspace-settings-shell.tsx`) — drop teams + billing from the in-page section list
- `apps/web-tanstack/src/routes/d/$workspaceSlug/index.tsx` — render `WorkspaceHomePage` instead of redirecting
- `apps/web-next/app/d/[workspaceSlug]/page.tsx` — same
- `apps/web-tanstack/src/pages/dev-page.tsx` — update links to new top-level URLs
- `apps/web-next/src/views/dev-page.tsx` — same
- `apps/web-tanstack/src/components/app-logo.tsx` — update any settings-teams / settings-billing links

### Deleted
- `apps/web-tanstack/src/components/app-rail.tsx`
- `apps/web-tanstack/src/components/nav-secondary.tsx` (the old standalone one; replaced by the sidebar-folder variant)
- `apps/web-next/src/components/app-rail.tsx`
- `apps/web-next/src/components/nav-secondary.tsx`
- `apps/web-tanstack/src/pages/workspace-settings/teams-page.tsx` (moved to a new location under `pages/workspace-teams/`)
- `apps/web-tanstack/src/pages/workspace-settings/teams/` (sub-components move with the page)
- `apps/web-next/src/views/workspace-settings/teams-page.tsx` (moved to `views/workspace-teams/`)
- `apps/web-next/src/views/workspace-settings/teams/` (sub-components move with the page)

## Testing

- Typecheck both apps after every structural change: `npm run typecheck`.
- Manual smoke in dev: `npm run dev` and verify at each breakpoint
  (lg, md, max-md) that (a) sidebar collapse/expand works, (b) `⌘B`
  toggles, (c) mobile sheet opens, (d) Settings collapsible expands
  with active-state highlight on the current sub-route, (e) icon-mode
  hover opens the Settings popup, (f) tooltips don't flicker when a
  popup is open.
- Navigate through Home → Teams → Billing → each Settings section and
  confirm no 404s and active state tracks `pathname`.

## Risks and mitigations

- **Duplication between the two NavMain implementations.** Mitigated
  by keeping them small; revisit extraction only if a third consumer
  appears.
- **Icon string enum in shared package.** If the enum drifts from
  installed `lucide-react` icons, the per-app `icon.tsx` resolver
  will surface that as a compile error via a `Record<LucideIconName, LucideIcon>` map.
- **PBAC-gated nav showing a flash of ungated items on first render.**
  `useCan()` resolves synchronously from the workspace store once it's
  hydrated; during hydration we render the skeleton shell, so no flash.
