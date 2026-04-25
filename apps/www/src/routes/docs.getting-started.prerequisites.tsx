import { createFileRoute } from '@tanstack/react-router'
import {
  PrerequisitesPage,
  meta,
} from '@/pages/docs/getting-started/prerequisites'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/getting-started/prerequisites')({
  head: () =>
    docsRouteHead({ ...meta, path: '/docs/getting-started/prerequisites' }),
  component: PrerequisitesPage,
})
