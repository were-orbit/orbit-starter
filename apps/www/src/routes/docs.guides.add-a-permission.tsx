import { createFileRoute } from '@tanstack/react-router'
import { AddAPermissionPage, meta } from '@/pages/docs/guides/add-a-permission'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/guides/add-a-permission')({
  head: () => docsRouteHead({ ...meta, path: '/docs/guides/add-a-permission' }),
  component: AddAPermissionPage,
})
