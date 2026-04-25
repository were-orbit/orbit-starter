import { createFileRoute } from '@tanstack/react-router'
import { DeployWebPage, meta } from '@/pages/docs/deploy/web'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/deploy/web')({
  head: () => docsRouteHead({ ...meta, path: '/docs/deploy/web' }),
  component: DeployWebPage,
})
