import { createFileRoute } from '@tanstack/react-router'
import {
  AuditLogIntegrationsPage,
  meta,
} from '@/pages/docs/integrations/audit-log'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/integrations/audit-log')({
  head: () => docsRouteHead({ ...meta, path: '/docs/integrations/audit-log' }),
  component: AuditLogIntegrationsPage,
})
