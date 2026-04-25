import { createFileRoute } from '@tanstack/react-router'
import {
  WorkspacesTeamsTenancyPage,
  meta,
} from '@/pages/docs/concepts/workspaces-teams-tenancy'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute(
  '/docs/concepts/workspaces-teams-tenancy',
)({
  head: () =>
    docsRouteHead({
      ...meta,
      path: '/docs/concepts/workspaces-teams-tenancy',
    }),
  component: WorkspacesTeamsTenancyPage,
})
