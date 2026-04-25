import { createFileRoute } from '@tanstack/react-router'
import { AddAPlanPage, meta } from '@/pages/docs/guides/add-a-plan'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/guides/add-a-plan')({
  head: () => docsRouteHead({ ...meta, path: '/docs/guides/add-a-plan' }),
  component: AddAPlanPage,
})
