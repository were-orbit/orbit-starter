import { createFileRoute } from '@tanstack/react-router'
import { WriteAJobPage, meta } from '@/pages/docs/guides/write-a-job'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/guides/write-a-job')({
  head: () => docsRouteHead({ ...meta, path: '/docs/guides/write-a-job' }),
  component: WriteAJobPage,
})
