import { createFileRoute } from '@tanstack/react-router'
import { ChangelogPage } from '@/pages/changelog'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})
