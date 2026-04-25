import { createFileRoute } from '@tanstack/react-router'
import { DeployPostgresPage, meta } from '@/pages/docs/deploy/postgres'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/deploy/postgres')({
  head: () => docsRouteHead({ ...meta, path: '/docs/deploy/postgres' }),
  component: DeployPostgresPage,
})
