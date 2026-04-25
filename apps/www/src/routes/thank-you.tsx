import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ThankYouPage } from '@/pages/thank-you'

const searchSchema = z.object({
  checkout_id: z.string().optional(),
  customer_session_token: z.string().optional(),
})

export const Route = createFileRoute('/thank-you')({
  validateSearch: searchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { checkout_id } = Route.useSearch()
  return <ThankYouPage initialCheckoutId={checkout_id ?? ''} />
}
