import { createFileRoute } from '@tanstack/react-router'
import {
  EnvironmentVariablesPage,
  meta,
} from '@/pages/docs/getting-started/environment-variables'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute(
  '/docs/getting-started/environment-variables',
)({
  head: () =>
    docsRouteHead({
      ...meta,
      path: '/docs/getting-started/environment-variables',
    }),
  component: EnvironmentVariablesPage,
})
