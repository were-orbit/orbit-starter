import { createFileRoute } from '@tanstack/react-router'
import {
  AddAnEmailTemplatePage,
  meta,
} from '@/pages/docs/guides/add-an-email-template'
import { docsRouteHead } from '@/lib/og'

export const Route = createFileRoute('/docs/guides/add-an-email-template')({
  head: () =>
    docsRouteHead({ ...meta, path: '/docs/guides/add-an-email-template' }),
  component: AddAnEmailTemplatePage,
})
