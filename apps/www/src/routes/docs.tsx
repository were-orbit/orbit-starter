import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/docs')({
  component: DocsLayoutRoute,
})

function DocsLayoutRoute() {
  return <Outlet />
}
