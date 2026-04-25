import { createFileRoute } from '@tanstack/react-router'
import { BoundedContextsPage, meta } from '@/pages/docs/concepts/bounded-contexts'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/concepts/bounded-contexts')({
  head: () => docsRouteHead({ ...meta, path: '/docs/concepts/bounded-contexts' }),
  component: BoundedContextsPage,
})
