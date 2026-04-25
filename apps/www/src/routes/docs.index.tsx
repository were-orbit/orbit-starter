import { createFileRoute } from '@tanstack/react-router'
import { DocsPage } from '@/pages/docs'
import { socialMeta } from '@/lib/og'

export const Route = createFileRoute('/docs/')({
  head: () => ({
    meta: [
      { title: 'Documentation · Orbit' },
      ...socialMeta({
        title: 'Documentation · Orbit',
        description:
          'Reference for the Orbit starter kit: getting started, concepts, guides, integrations, and deploy.',
        variant: 'docs',
        path: '/docs',
      }),
    ],
  }),
  component: DocsPage,
})
