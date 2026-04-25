import { createFileRoute } from '@tanstack/react-router'
import { TwoScopePbacPage, meta } from '@/pages/docs/concepts/two-scope-pbac'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/concepts/two-scope-pbac')({
  head: () => docsRouteHead({ ...meta, path: '/docs/concepts/two-scope-pbac' }),
  component: TwoScopePbacPage,
})
