import { createFileRoute } from '@tanstack/react-router'
import { RealtimeEventsPage, meta } from '@/pages/docs/concepts/realtime-events'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/concepts/realtime-events')({
  head: () => docsRouteHead({ ...meta, path: '/docs/concepts/realtime-events' }),
  component: RealtimeEventsPage,
})
