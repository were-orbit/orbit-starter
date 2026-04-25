import { createFileRoute } from '@tanstack/react-router'
import { ConfigurePage } from '@/pages/configure'

export const Route = createFileRoute('/configure')({
  component: ConfigurePage,
})
