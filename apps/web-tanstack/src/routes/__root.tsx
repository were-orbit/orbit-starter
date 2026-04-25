/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  createRootRouteWithContext,
  HeadContent,
  isRedirect,
  Outlet,
  redirect,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import appCss from '@orbit/ui/styles.css?url'
import {
  ORBIT_THEME_PALETTE_STORAGE_KEY,
  ORBIT_THEME_STORAGE_KEY,
  ThemeProvider,
} from '@orbit/ui/theme-provider'
import { ToastProvider } from '@orbit/ui/toast'

const ORBIT_THEME_HEAD_SCRIPT = `!function(){try{var k=${JSON.stringify(ORBIT_THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);var pk=${JSON.stringify(ORBIT_THEME_PALETTE_STORAGE_KEY)};var pal=localStorage.getItem(pk);if(!pal||!/^[a-z]+$/.test(pal))pal="graphite";document.documentElement.setAttribute("data-palette",pal);}catch(e){}}();`
import { ApiError } from '@/lib/api/client'
// +feature:auth-admin
import { ImpersonationBanner } from '@/components/impersonation-banner'
// -feature:auth-admin
// +feature:realtime
import { RealtimeProvider } from '@/lib/db/provider'
// -feature:realtime
import { AppQueryProvider } from '@/lib/query-provider'
import { meQueryOptions } from '@/lib/queries/session'
import type { OrbitRouterContext } from '@/lib/router-context'
import { isTanstackDevtoolsEnabled } from '@/lib/tanstack-devtools-enabled'
import { socialMeta } from '@/lib/og'
import {
  clearClientSessionCaches,
  getPreferredWorkspaceSlug,
  setPreferredWorkspaceSlug,
} from '@/lib/workspace'

export const Route = createRootRouteWithContext<OrbitRouterContext>()({
  /** `/` is handled here (not on `routes/index`) so it runs before pathless layouts and always applies. */
  beforeLoad: async ({ context, location }) => {
    if (location.pathname !== '/') return

    let me
    try {
      me = await context.queryClient.ensureQueryData(meQueryOptions)
    } catch (err) {
      if (isRedirect(err)) throw err
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403 || err.status === 404)
      ) {
        clearClientSessionCaches()
        throw redirect({ to: '/login' })
      }
      throw err
    }
    if (me.workspaces.length === 0) {
      throw redirect({ to: '/onboarding' })
    }
    const preferred = getPreferredWorkspaceSlug()
    if (preferred && !me.workspaces.some((w) => w.slug === preferred)) {
      setPreferredWorkspaceSlug(null)
    }
    const slug =
      (preferred && me.workspaces.find((w) => w.slug === preferred)?.slug) ||
      me.workspaces[0]!.slug
    throw redirect({
      to: '/d/$workspaceSlug',
      params: { workspaceSlug: slug },
      replace: true,
    })
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'color-scheme', content: 'light dark' },
      { title: 'Orbit — move together' },
      ...socialMeta({
        title: 'Orbit — move together',
        description:
          'Workspaces, teams, PBAC, billing — your SaaS, ready to ship.',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <AppQueryProvider>
        <ToastProvider>
          {/* +feature:realtime */}
          <RealtimeProvider>
            {/* -feature:realtime */}
            {/* +feature:auth-admin */}
            <ImpersonationBanner />
            {/* -feature:auth-admin */}
            <Outlet />
            {isTanstackDevtoolsEnabled() ? (
              <TanStackRouterDevtools position="bottom-right" />
            ) : null}
            {/* +feature:realtime */}
          </RealtimeProvider>
          {/* -feature:realtime */}
        </ToastProvider>
      </AppQueryProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: ORBIT_THEME_HEAD_SCRIPT }}
        />
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
