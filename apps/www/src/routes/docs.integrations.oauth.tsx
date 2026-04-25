import { createFileRoute } from '@tanstack/react-router'
import { OAuthIntegrationsPage, meta } from '@/pages/docs/integrations/oauth'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/integrations/oauth')({
  head: () => docsRouteHead({ ...meta, path: '/docs/integrations/oauth' }),
  component: OAuthIntegrationsPage,
})
