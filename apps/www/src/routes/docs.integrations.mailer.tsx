import { createFileRoute } from '@tanstack/react-router'
import { MailerIntegrationsPage, meta } from '@/pages/docs/integrations/mailer'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/integrations/mailer')({
  head: () => docsRouteHead({ ...meta, path: '/docs/integrations/mailer' }),
  component: MailerIntegrationsPage,
})
