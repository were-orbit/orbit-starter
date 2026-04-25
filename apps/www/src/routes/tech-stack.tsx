import { createFileRoute } from '@tanstack/react-router'
import { TechStackPage } from '@/pages/tech-stack'

export const Route = createFileRoute('/tech-stack')({
  component: TechStackPage,
})
