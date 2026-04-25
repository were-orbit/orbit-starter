import { createFileRoute } from '@tanstack/react-router'
import { JobsIntegrationsPage, meta } from '@/pages/docs/integrations/jobs'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/integrations/jobs')({
  head: () => docsRouteHead({ ...meta, path: '/docs/integrations/jobs' }),
  component: JobsIntegrationsPage,
})
