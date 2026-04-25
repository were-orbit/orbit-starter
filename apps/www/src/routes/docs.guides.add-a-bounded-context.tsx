import { createFileRoute } from '@tanstack/react-router'
import {
  AddABoundedContextPage,
  meta,
} from '@/pages/docs/guides/add-a-bounded-context'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/guides/add-a-bounded-context')({
  head: () =>
    docsRouteHead({ ...meta, path: '/docs/guides/add-a-bounded-context' }),
  component: AddABoundedContextPage,
})
