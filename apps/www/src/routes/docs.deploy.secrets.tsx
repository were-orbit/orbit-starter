import { createFileRoute } from '@tanstack/react-router'
import { DeploySecretsPage, meta } from '@/pages/docs/deploy/secrets'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/deploy/secrets')({
  head: () => docsRouteHead({ ...meta, path: '/docs/deploy/secrets' }),
  component: DeploySecretsPage,
})
