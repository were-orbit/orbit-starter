import { createFileRoute } from '@tanstack/react-router'
import { DevServerPage, meta } from '@/pages/docs/getting-started/dev-server'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/getting-started/dev-server')({
  head: () => docsRouteHead({ ...meta, path: '/docs/getting-started/dev-server' }),
  component: DevServerPage,
})
