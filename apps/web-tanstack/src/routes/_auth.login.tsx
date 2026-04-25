import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/pages/login'
// +feature:auth-admin
import { isBannedUserSearchParam } from '@/lib/banned-error'
// -feature:auth-admin

export const Route = createFileRoute('/_auth/login')({
  beforeLoad: ({ location }) => {
    const error = (location.search as Record<string, unknown>).error
    // +feature:auth-admin
    // OAuth callbacks for a banned account land here with
    // `?error=BANNED_USER`. Jump to the full-bleed `/banned` screen so
    // the split auth layout never renders.
    if (isBannedUserSearchParam(error)) {
      throw redirect({ to: '/banned', replace: true })
    }
    // -feature:auth-admin
  },
  component: LoginPage,
})
