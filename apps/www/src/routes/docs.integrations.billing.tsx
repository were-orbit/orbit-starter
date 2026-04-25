import { createFileRoute } from '@tanstack/react-router'
import {
  BillingIntegrationsPage,
  meta,
} from '@/pages/docs/integrations/billing'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/integrations/billing')({
  head: () => docsRouteHead({ ...meta, path: '/docs/integrations/billing' }),
  component: BillingIntegrationsPage,
})
