import { createFileRoute } from '@tanstack/react-router'
import {
  FirstMigrationAndSeedPage,
  meta,
} from '@/pages/docs/getting-started/first-migration-and-seed'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute(
  '/docs/getting-started/first-migration-and-seed',
)({
  head: () =>
    docsRouteHead({
      ...meta,
      path: '/docs/getting-started/first-migration-and-seed',
    }),
  component: FirstMigrationAndSeedPage,
})
