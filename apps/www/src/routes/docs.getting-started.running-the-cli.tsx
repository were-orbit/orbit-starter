import { createFileRoute } from '@tanstack/react-router'
import {
  RunningTheCliPage,
  meta,
} from '@/pages/docs/getting-started/running-the-cli'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/getting-started/running-the-cli')({
  head: () =>
    docsRouteHead({ ...meta, path: '/docs/getting-started/running-the-cli' }),
  component: RunningTheCliPage,
})
