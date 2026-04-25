import { createFileRoute } from '@tanstack/react-router'
import { FeaturesPage } from '@/pages/features'

export const Route = createFileRoute('/features')({
  component: FeaturesPage,
})
