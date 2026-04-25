import { createFileRoute } from '@tanstack/react-router'
import { DeployWebhooksPage, meta } from '@/pages/docs/deploy/webhooks'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/deploy/webhooks')({
  head: () => docsRouteHead({ ...meta, path: '/docs/deploy/webhooks' }),
  component: DeployWebhooksPage,
})
