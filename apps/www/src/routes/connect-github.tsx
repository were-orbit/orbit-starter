import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ConnectGithubPage } from '@/pages/connect-github'

const searchSchema = z.object({
  checkout_id: z.string().optional(),
  customer_session_token: z.string().optional(),
})

export const Route = createFileRoute('/connect-github')({
  validateSearch: searchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { checkout_id } = Route.useSearch()
  return <ConnectGithubPage initialCheckoutId={checkout_id ?? ''} />
}
