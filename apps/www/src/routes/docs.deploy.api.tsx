import { createFileRoute } from '@tanstack/react-router'
import { DeployApiPage, meta } from '@/pages/docs/deploy/api'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/deploy/api')({
  head: () => docsRouteHead({ ...meta, path: '/docs/deploy/api' }),
  component: DeployApiPage,
})
