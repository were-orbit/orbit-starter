import { createFileRoute } from '@tanstack/react-router'
import {
  UploadsIntegrationsPage,
  meta,
} from '@/pages/docs/integrations/uploads'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/integrations/uploads')({
  head: () => docsRouteHead({ ...meta, path: '/docs/integrations/uploads' }),
  component: UploadsIntegrationsPage,
})
