import { createFileRoute } from '@tanstack/react-router'
import { UnitOfWorkPage, meta } from '@/pages/docs/concepts/unit-of-work'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/concepts/unit-of-work')({
  head: () => docsRouteHead({ ...meta, path: '/docs/concepts/unit-of-work' }),
  component: UnitOfWorkPage,
})
