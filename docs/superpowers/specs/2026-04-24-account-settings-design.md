# Account Settings Page

## Goal

Give every signed-in user a single place to manage their identity independent of any workspace: update their name, change their email (with verification), review and revoke active sessions, and delete their account.

## Scope

- New top-level `/account` route, rendered in both `apps/web-next` (Next App Router) and `apps/web-tanstack` (TanStack file routes), outside the workspace shell.
- One page, four stacked sections: Profile, Email, Sessions, Danger zone.
- Entry point: new "Account settings" item in the sidebar user menu (`UserMenu`) above "Sign out", in both apps.
- API: enable better-auth's built-in email-change and delete-user flows, plus a new identity service that blocks deletion when the user is the sole owner of one or more workspaces.
- Mailer: two new transactional templates (change-email verification, account deletion verification) via the existing Resend-backed mailer port.

Out of scope for v1:
- Inline ownership transfer (we block deletion and send the user back to the workspace to resolve it themselves).
- Password change (repo uses magic link + OAuth by default).
- Avatar/tone editing (not requested; existing tone lives on `User`).
- 2FA / MFA.

## Architecture

### Routing and shell

- `apps/web-next/src/app/account/page.tsx` — Next route. Uses a thin shell: top bar with back-to-workspace link (to `/d/<lastWorkspaceSlug>` if we have it in store, otherwise `/`) and the user's display name/email; no sidebar.
- `apps/web-tanstack/src/routes/account.tsx` — TanStack file route with equivalent shell.
- Both routes require an authenticated session; unauthenticated users are redirected to `/login?next=/account`.
- Page content is a per-app React view at `apps/web-{next,tanstack}/src/views/account/account-page.tsx`. Each app has its own file to stay consistent with the repo's per-app view pattern; the sections are built from `@orbit/ui` primitives so visual parity is automatic.

### Sidebar user menu

`apps/web-{next,tanstack}/src/components/user-menu.tsx` both get a new `MenuItem` ("Account settings", `UserIcon`) above "Sign out", linking to `/account`.

### API — better-auth configuration

In `apps/api/src/interfaces/http/better-auth.ts`, extend the `betterAuth(...)` config:

```ts
user: {
  changeEmail: {
    enabled: true,
    sendChangeEmailVerification: async ({ user, newEmail, url }) => {
      await mailer.sendChangeEmailVerification({
        to: newEmail,
        currentEmail: user.email,
        link: url,
      });
    },
  },
  deleteUser: {
    enabled: true,
    sendDeleteAccountVerification: async ({ user, url }) => {
      await mailer.sendAccountDeletionVerification({
        to: user.email,
        link: url,
      });
    },
    beforeDelete: async (user) => {
      await assertUserCanBeDeleted.execute(user.id);
    },
  },
},
```

- `updateUser` (name changes) is enabled by default in better-auth; no config required.
- `changeEmail` sends the verification link to the **new** email address; the DB row is updated only after the user clicks the link.
- `deleteUser` sends the final confirmation link to the **current** email; `beforeDelete` runs server-side at delete time and throws a `DomainError` if the user is the sole owner of any workspace, which better-auth surfaces as a 4xx response.

### API — new identity service

**Important distinction between two "owner" concepts:**

- `Workspace.ownerId` (single column, `onDelete: Restrict`) — exactly one per workspace, and this is what blocks user deletion at the database level.
- `WorkspaceRole.systemKey === "OWNER"` (PBAC role assignable to many members) — grants admin-level permissions but has nothing to do with `Workspace.ownerId`.

The deletion guard cares only about `Workspace.ownerId`. Multiple members with the OWNER *role* do not unblock deletion, because the DB constraint is on the column, not on role rows.

`apps/api/src/identity/application/assert-user-can-be-deleted.service.ts`:

- Input: `userId: UserId`.
- Queries `Workspace.ownerId = userId` via a new `WorkspaceRepository.findOwnedBy` method.
- If any rows are returned, throws `DomainError("account.delete.sole_owner", ..., { blockingWorkspaces: [{ id, name, slug }] })`.
- Wired into `composition.ts` and passed to `buildBetterAuth` (which receives a new `accountHooks` parameter carrying the assertion callback).

Unit tests alongside the service, matching the pattern used by `update-preferences.service.test.ts`.

**Known limitation for v1:** There is no UI today to transfer `Workspace.ownerId` to another member. A user blocked by this check must either delete the workspace entirely or have someone else edit the `ownerId` directly in the DB. Inline ownership transfer is an obvious follow-up and is called out in "Out of scope" above.

### API — new endpoint

`GET /v1/me/owned-workspaces-blocking-delete` (added to `me.preferences.controller.ts` or a new `me.controller.ts` — decide during implementation to keep files small).

- Auth-required.
- Returns `{ workspaces: Array<{ id, name, slug }> }` — the subset of workspaces where the current user is the sole owner.
- Backed by a read-only method on the identity application layer that wraps the same query logic as `AssertUserCanBeDeletedService` (extract a shared helper).

### API — mailer

`apps/api/src/infrastructure/mailer.ts` gains two new methods on the `Mailer` port:

- `sendChangeEmailVerification({ to, currentEmail, link })`
- `sendAccountDeletionVerification({ to, link })`

Both are implemented in the Resend adapter, with plain-text templates alongside the existing magic-link template. Expose dev-only access via `GET /v1/dev/last-magic-link` equivalents if easy, otherwise log to console in dev (matching existing pattern).

### Web — page behavior per section

**Profile**
- Controlled input bound to `useMeUser().name`.
- Save button calls `authClient.updateUser({ name })`, invalidates the `me` query, shows a success toast.

**Email**
- Shows current email read-only.
- "Change email" inline form: new email input + Send verification button → `authClient.changeEmail({ newEmail, callbackURL: "/account?emailChanged=1" })`.
- Post-submit: renders "Check your inbox at `<new email>`. Click the link to confirm." State persists until the user navigates away.

**Sessions**
- `authClient.listSessions()` on load; skeleton while fetching.
- Render rows with user-agent parsed into a short label (browser + OS), last-active relative time, and a "Current" badge for the session matching the current session token.
- Per-row Sign out → `authClient.revokeSession({ token })`, optimistic remove.
- "Sign out of all other sessions" footer button → `authClient.revokeOtherSessions()`.

**Danger zone**
- On page mount, fetch `/v1/me/owned-workspaces-blocking-delete`.
- If the list is non-empty: render a warning panel listing each blocking workspace with a "Open workspace" link to `/d/<slug>`. The delete button is disabled with a tooltip: "Transfer or delete these workspaces first."
- If the list is empty: render a destructive-styled "Delete account" button. Clicking opens a confirm dialog:
  - Copy: "This deletes your account, your memberships, and any workspace where you are the only member. This cannot be undone."
  - Input: "Type your email to confirm" — validates against the current email.
  - Primary action: "Send deletion link" → `authClient.deleteUser({ callbackURL: "/?accountDeleted=1" })`.
  - After submit: "Check your inbox at `<current email>`. Click the link to finish deleting your account."
- When better-auth returns the `sole_owner` error (rare: race between page load and delete), the dialog surfaces the error with the blocking-workspaces list.

## Data flow

```
User action (web)             API / better-auth                 DB / side effects
─────────────────────────     ─────────────────────────────     ─────────────────────────
updateUser({ name })          better-auth core                  User.name updated
changeEmail({ newEmail })     sendChangeEmailVerification       email sent (no DB change)
  click link                  change-email callback             User.email updated
deleteUser()                  beforeDelete → assert service     throws if sole owner, else
                              sendDeleteAccountVerification     email sent
  click link                  delete-user callback              User + memberships + orphan
                                                                workspaces deleted
listSessions / revoke*        better-auth core                  Session rows updated
```

## Errors and edge cases

- **Change email to an address owned by another user:** better-auth rejects at `changeEmail`; surface the provider's error message.
- **Change email while waitlist is enabled and new email is not whitelisted:** current waitlist check is a `create`-hook on the user. An email change does not create a user, so waitlist does not apply. Call out in the code comment that this is intentional.
- **User with zero owned workspaces and zero memberships:** delete proceeds directly; nothing to block.
- **Sole-owner workspace with zero other members:** deletion cascades to that workspace via better-auth's delete callback + existing Prisma relations (need to confirm `onDelete: Cascade` on memberships; if not, add explicit cleanup in a post-delete hook). Implementation task will verify.
- **User deletes account while holding an active session elsewhere:** all sessions are revoked by better-auth's delete flow.

## Testing

- **API unit tests:** `assert-user-can-be-deleted.service.test.ts` covers: no owned workspaces, owned workspace with other owners, sole-owner workspace, multiple sole-owner workspaces.
- **API integration test (if the repo has a pattern for it):** `GET /v1/me/owned-workspaces-blocking-delete` returns expected shape; otherwise skip — the service is covered by unit tests.
- **Web:** manual QA of each section against a local dev API. No Playwright tests added in v1 unless the repo already has an E2E harness covering settings (it does not — `apps/api` is the only workspace with tests).

## Implementation order

1. Mailer port additions + Resend adapter templates.
2. `AssertUserCanBeDeletedService` + unit tests.
3. Wire new service + mailer methods into `composition.ts` and `buildBetterAuth`.
4. Enable `changeEmail` and `deleteUser` in better-auth config.
5. New `GET /v1/me/owned-workspaces-blocking-delete` endpoint.
6. Shared `account-page.tsx` view (or per-app views) — Profile + Email sections first.
7. Sessions section.
8. Danger zone section.
9. Sidebar `UserMenu` — add "Account settings" link in both apps.
10. Add `/account` route in both `apps/web-next` and `apps/web-tanstack`.
11. Manual QA: happy path + each error path.
