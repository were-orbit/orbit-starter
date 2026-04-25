import { createFileRoute } from '@tanstack/react-router'
import { OrmIntegrationsPage, meta } from '@/pages/docs/integrations/orm'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/integrations/orm')({
  head: () => docsRouteHead({ ...meta, path: '/docs/integrations/orm' }),
  component: OrmIntegrationsPage,
})
