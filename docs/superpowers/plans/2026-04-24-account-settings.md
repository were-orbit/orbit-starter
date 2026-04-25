# Account Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give signed-in users a top-level `/account` page to update their name, change their email (with verification), manage active sessions, and delete their account (blocked if they own any workspace).

**Architecture:** Thin layer over better-auth's built-in `updateUser`, `changeEmail`, `deleteUser`, and session endpoints. A new identity service enforces the "sole owner blocks delete" rule via better-auth's `beforeDelete` hook. A new endpoint returns the same blocking-workspace list to the UI so the user sees the reason before they try. Account page lives outside the workspace shell as a top-level route in both `apps/web-next` (Next App Router) and `apps/web-tanstack` (TanStack file routes).

**Tech Stack:** Hono + Prisma + better-auth (API), React 19 + better-auth/react + @tanstack/react-query (web), @orbit/ui + Tailwind v4 (components), Resend + @react-email/components (email templates), vitest (tests).

**Spec:** `docs/superpowers/specs/2026-04-24-account-settings-design.md`

**Key finding from codebase exploration:** There are two distinct "owner" concepts:
1. `Workspace.ownerId` — a single column on `Workspace`, `onDelete: Restrict`. Exactly one per workspace; this is what blocks user deletion at the DB level.
2. `WorkspaceRole.systemKey === "OWNER"` — a PBAC role that the UI lets admins assign to many members. Grants permissions only; has no bearing on `Workspace.ownerId`.

This plan's deletion guard is scoped to (1). Multiple members holding the OWNER *role* do not unblock deletion, because the DB constraint is on the column. **Caveat:** there is no UI today to transfer `Workspace.ownerId`; a user blocked by this check must delete the workspace or have someone edit `ownerId` in SQL. Inline transfer is called out in the spec as out-of-scope for v1.

---

## File Structure

**Create:**
- `apps/api/src/emails/change-email-verification-email.tsx` — React Email template
- `apps/api/src/emails/account-deletion-verification-email.tsx` — React Email template
- `apps/api/src/identity/application/list-blocking-owned-workspaces.service.ts` — read service returning owned workspaces
- `apps/api/src/identity/application/assert-user-can-be-deleted.service.ts` — assertion used by better-auth `beforeDelete`
- `apps/api/src/identity/application/assert-user-can-be-deleted.service.test.ts`
- `apps/api/src/identity/application/list-blocking-owned-workspaces.service.test.ts`
- `apps/api/src/interfaces/http/controllers/me.account.controller.ts` — new Hono sub-router for `/me/owned-workspaces-blocking-delete`
- `apps/web-next/src/app/account/page.tsx`
- `apps/web-next/src/app/account/layout.tsx`
- `apps/web-next/src/views/account/account-page.tsx`
- `apps/web-next/src/views/account/profile-section.tsx`
- `apps/web-next/src/views/account/email-section.tsx`
- `apps/web-next/src/views/account/sessions-section.tsx`
- `apps/web-next/src/views/account/danger-zone-section.tsx`
- `apps/web-tanstack/src/routes/account.tsx`
- `apps/web-tanstack/src/views/account/account-page.tsx` (+ four section components mirroring the above)
- `apps/web-next/src/lib/queries/account.ts` — react-query options for blocking workspaces + session list
- `apps/web-tanstack/src/lib/queries/account.ts` — same

**Modify:**
- `apps/api/src/infrastructure/mailer.ts` — add two interface methods + ConsoleMailer impls
- `apps/api/src/infrastructure/resend-mailer.tsx` — add two Resend impls
- `apps/api/src/interfaces/http/better-auth.ts` — enable `changeEmail` + `deleteUser` config, accept new callbacks
- `apps/api/src/composition.ts` — wire new services, pass callbacks to `buildBetterAuth`
- `apps/api/src/identity/feature.ts` — register new services
- `apps/api/src/interfaces/http/router.ts` — mount `me.account` controller
- `apps/web-next/src/lib/auth-client.ts` — no change (built-in methods work without plugins)
- `apps/web-next/src/components/user-menu.tsx` + `apps/web-tanstack/src/components/user-menu.tsx` — add "Account settings" item

---

## Task 1: Add mailer interface + ConsoleMailer stubs for two new templates

**Files:**
- Modify: `apps/api/src/infrastructure/mailer.ts`

- [ ] **Step 1: Add two new interface types and methods**

Open `apps/api/src/infrastructure/mailer.ts` and add after the `InviteEmail` interface:

```ts
export interface ChangeEmailVerificationEmail {
  to: string;
  currentEmail: string;
  link: string;
}

export interface AccountDeletionVerificationEmail {
  to: string;
  link: string;
}
```

Update the `Mailer` interface to add:

```ts
sendChangeEmailVerification(email: ChangeEmailVerificationEmail): Promise<void>;
sendAccountDeletionVerification(email: AccountDeletionVerificationEmail): Promise<void>;
```

Add ConsoleMailer implementations at the end of the class:

```ts
async sendChangeEmailVerification(email: ChangeEmailVerificationEmail): Promise<void> {
  console.log(
    `[mailer] change-email verification → ${email.to} (current: ${email.currentEmail})\n         link=${email.link}`,
  );
}

async sendAccountDeletionVerification(email: AccountDeletionVerificationEmail): Promise<void> {
  console.log(
    `[mailer] account-deletion verification → ${email.to}\n         link=${email.link}`,
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace @orbit/api`
Expected: PASS. `ResendMailer` will fail because it doesn't yet implement the two new methods — that's OK **only if** the typecheck is not run until after Task 2. Proceed to Task 2 immediately without committing yet.

---

## Task 2: Add ResendMailer implementations + React Email templates

**Files:**
- Create: `apps/api/src/emails/change-email-verification-email.tsx`
- Create: `apps/api/src/emails/account-deletion-verification-email.tsx`
- Modify: `apps/api/src/infrastructure/resend-mailer.tsx`

- [ ] **Step 1: Inspect the existing magic-link email for style**

Run: `cat apps/api/src/emails/magic-link-email.tsx | head -40`
Expected: see the `SignInMagicLinkEmail` component using `@react-email/components` primitives (`Html`, `Body`, `Container`, `Heading`, `Text`, `Button`).

- [ ] **Step 2: Create `change-email-verification-email.tsx`**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface Props {
  verifyUrl: string;
  currentEmail: string;
}

export function ChangeEmailVerificationEmail({ verifyUrl, currentEmail }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your new Orbit email address</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f6f7" }}>
        <Container style={{ background: "#fff", padding: "32px", borderRadius: "8px", maxWidth: 480 }}>
          <Heading as="h1" style={{ fontSize: 20 }}>Confirm your new email</Heading>
          <Text>
            Someone (hopefully you) asked to change the email on the Orbit account registered
            to <strong>{currentEmail}</strong>.
          </Text>
          <Text>Click below to confirm the change to this address.</Text>
          <Button
            href={verifyUrl}
            style={{ background: "#111", color: "#fff", padding: "10px 16px", borderRadius: 6 }}
          >
            Confirm new email
          </Button>
          <Text style={{ color: "#666", fontSize: 12 }}>
            If you did not request this, you can ignore this email. Your address will not change.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Create `account-deletion-verification-email.tsx`**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface Props {
  verifyUrl: string;
}

export function AccountDeletionVerificationEmail({ verifyUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Confirm deleting your Orbit account</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f6f7" }}>
        <Container style={{ background: "#fff", padding: "32px", borderRadius: "8px", maxWidth: 480 }}>
          <Heading as="h1" style={{ fontSize: 20 }}>Confirm account deletion</Heading>
          <Text>
            You requested to delete your Orbit account. Clicking the button below will
            permanently delete your account, your workspace memberships, and any
            workspace where you are the only member.
          </Text>
          <Button
            href={verifyUrl}
            style={{ background: "#b42318", color: "#fff", padding: "10px 16px", borderRadius: 6 }}
          >
            Delete my account
          </Button>
          <Text style={{ color: "#666", fontSize: 12 }}>
            If you did not request this, ignore this email and your account will remain active.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Add ResendMailer implementations**

Open `apps/api/src/infrastructure/resend-mailer.tsx`. Add imports near the top:

```tsx
import { ChangeEmailVerificationEmail } from "@/emails/change-email-verification-email.tsx";
import { AccountDeletionVerificationEmail } from "@/emails/account-deletion-verification-email.tsx";
import type {
  ChangeEmailVerificationEmail as ChangeEmailDto,
  AccountDeletionVerificationEmail as AccountDeletionDto,
} from "@/infrastructure/mailer.ts";
```

Update the existing import block from `./mailer.ts` to include the new DTO types. Then add inside the `ResendMailer` class:

```tsx
async sendChangeEmailVerification(email: ChangeEmailDto): Promise<void> {
  const to = email.to.trim();
  const node = (
    <ChangeEmailVerificationEmail
      verifyUrl={email.link}
      currentEmail={email.currentEmail}
    />
  );
  const html = await render(node);
  const text = await render(node, { plainText: true });
  const { error } = await this.client.emails.send({
    from: this.from,
    to,
    subject: "Confirm your new Orbit email",
    html,
    text,
  });
  if (error) throw new Error(error.message);
}

async sendAccountDeletionVerification(email: AccountDeletionDto): Promise<void> {
  const to = email.to.trim();
  const node = <AccountDeletionVerificationEmail verifyUrl={email.link} />;
  const html = await render(node);
  const text = await render(node, { plainText: true });
  const { error } = await this.client.emails.send({
    from: this.from,
    to,
    subject: "Confirm deleting your Orbit account",
    html,
    text,
  });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck --workspace @orbit/api`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/infrastructure/mailer.ts apps/api/src/infrastructure/resend-mailer.tsx apps/api/src/emails/change-email-verification-email.tsx apps/api/src/emails/account-deletion-verification-email.tsx
git commit -m "feat(api): add mailer methods for change-email + account deletion verification"
```

---

## Task 3: List blocking owned workspaces service (read)

**Files:**
- Create: `apps/api/src/identity/application/list-blocking-owned-workspaces.service.ts`
- Test: `apps/api/src/identity/application/list-blocking-owned-workspaces.service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { ListBlockingOwnedWorkspacesService } from "./list-blocking-owned-workspaces.service.ts";
import type { UserId } from "@/identity/domain/user.ts";

const userId = "user_01" as UserId;

function makeUow(rows: Array<{ id: string; name: string; slug: string }>) {
  const findOwnedBy = vi.fn(async (_uid: UserId) => rows);
  const uow = {
    read: async <T,>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        workspaces: {
          findOwnedBy,
        },
      }),
    run: async <T,>(fn: (tx: unknown) => Promise<T>) =>
      fn({ workspaces: { findOwnedBy }, events: { add: vi.fn(), addMany: vi.fn() } }),
  };
  return { uow, findOwnedBy };
}

describe("ListBlockingOwnedWorkspacesService", () => {
  it("returns an empty list when the user owns no workspaces", async () => {
    const { uow } = makeUow([]);
    const svc = new ListBlockingOwnedWorkspacesService(uow as never);
    const out = await svc.execute(userId);
    expect(out).toEqual({ workspaces: [] });
  });

  it("returns owned workspaces as-is", async () => {
    const { uow } = makeUow([
      { id: "ws_01", name: "Acme", slug: "acme" },
      { id: "ws_02", name: "Beta", slug: "beta" },
    ]);
    const svc = new ListBlockingOwnedWorkspacesService(uow as never);
    const out = await svc.execute(userId);
    expect(out.workspaces).toHaveLength(2);
    expect(out.workspaces[0]).toEqual({ id: "ws_01", name: "Acme", slug: "acme" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace @orbit/api -- list-blocking-owned-workspaces`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Check what method exists on the workspaces repo**

Run: `grep -n "findOwnedBy\|findByOwner\|interface WorkspaceRepo\|findById" apps/api/src/workspaces/domain/repositories.ts apps/api/src/workspaces/infrastructure/*.ts 2>/dev/null | head -20`

Note whether `findOwnedBy` exists. If it does not, you will need to add it (next step of this task handles that).

- [ ] **Step 4: Add the repo method if missing**

In `apps/api/src/workspaces/domain/repositories.ts`, add to the `WorkspaceRepository` interface:

```ts
findOwnedBy(userId: UserId): Promise<Array<{ id: WorkspaceId; name: string; slug: string }>>;
```

(Import `UserId` from `@/identity/domain/user.ts` if not already imported.)

In `apps/api/src/workspaces/infrastructure/prisma-workspace.repository.ts`, add:

```ts
async findOwnedBy(userId: UserId) {
  const rows = await this.prisma.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id as WorkspaceId,
    name: r.name,
    slug: r.slug,
  }));
}
```

(Adjust imports to match the file's existing style — check the top of the file first with `head -20`.)

- [ ] **Step 5: Write the service**

Create `apps/api/src/identity/application/list-blocking-owned-workspaces.service.ts`:

```ts
import type { UserId } from "@/identity/domain/user.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";

export interface BlockingOwnedWorkspace {
  id: string;
  name: string;
  slug: string;
}

export interface ListBlockingOwnedWorkspacesResult {
  workspaces: BlockingOwnedWorkspace[];
}

/**
 * Returns workspaces owned by the user. Because `Workspace.ownerId` is
 * a single column and deletion has `onDelete: Restrict`, every row here
 * blocks account deletion until the user transfers ownership or
 * deletes the workspace.
 */
export class ListBlockingOwnedWorkspacesService {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(userId: UserId): Promise<ListBlockingOwnedWorkspacesResult> {
    return this.uow.read(async (tx) => {
      const rows = await tx.workspaces.findOwnedBy(userId);
      return {
        workspaces: rows.map((r) => ({
          id: String(r.id),
          name: r.name,
          slug: r.slug,
        })),
      };
    });
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test --workspace @orbit/api -- list-blocking-owned-workspaces`
Expected: PASS (both tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/identity/application/list-blocking-owned-workspaces.service.ts apps/api/src/identity/application/list-blocking-owned-workspaces.service.test.ts apps/api/src/workspaces/domain/repositories.ts apps/api/src/workspaces/infrastructure/prisma-workspace.repository.ts
git commit -m "feat(api): list workspaces that block user deletion"
```

---

## Task 4: Assert user can be deleted service (throws on sole ownership)

**Files:**
- Create: `apps/api/src/identity/application/assert-user-can-be-deleted.service.ts`
- Test: `apps/api/src/identity/application/assert-user-can-be-deleted.service.test.ts`

- [ ] **Step 1: Look at existing DomainError patterns**

Run: `grep -n "class DomainError\|class.*Error " apps/api/src/kernel/errors.ts | head -10`
Expected: see available error classes. We'll use `DomainError` (or whatever the existing convention is — likely a `ConflictError` or similar). Read the file if unsure: `cat apps/api/src/kernel/errors.ts`.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { AssertUserCanBeDeletedService } from "./assert-user-can-be-deleted.service.ts";
import type { UserId } from "@/identity/domain/user.ts";

const userId = "user_01" as UserId;

function makeSvc(rows: Array<{ id: string; name: string; slug: string }>) {
  const list = {
    execute: vi.fn(async () => ({ workspaces: rows })),
  };
  return {
    svc: new AssertUserCanBeDeletedService(list as never),
    list,
  };
}

describe("AssertUserCanBeDeletedService", () => {
  it("resolves when the user owns no workspaces", async () => {
    const { svc } = makeSvc([]);
    await expect(svc.execute(userId)).resolves.toBeUndefined();
  });

  it("throws with workspace names when the user owns any", async () => {
    const { svc } = makeSvc([{ id: "ws_01", name: "Acme", slug: "acme" }]);
    await expect(svc.execute(userId)).rejects.toThrow(/sole owner/i);
  });

  it("attaches the blocking workspace list to the error", async () => {
    const { svc } = makeSvc([
      { id: "ws_01", name: "Acme", slug: "acme" },
      { id: "ws_02", name: "Beta", slug: "beta" },
    ]);
    await expect(svc.execute(userId)).rejects.toMatchObject({
      details: {
        blockingWorkspaces: [
          { id: "ws_01", name: "Acme", slug: "acme" },
          { id: "ws_02", name: "Beta", slug: "beta" },
        ],
      },
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test --workspace @orbit/api -- assert-user-can-be-deleted`
Expected: FAIL with "Cannot find module"

- [ ] **Step 4: Write the service**

Create `apps/api/src/identity/application/assert-user-can-be-deleted.service.ts`:

```ts
import type { UserId } from "@/identity/domain/user.ts";
import { DomainError } from "@/kernel/errors.ts";
import { ListBlockingOwnedWorkspacesService } from "./list-blocking-owned-workspaces.service.ts";

/**
 * Verifies a user may be deleted. Because `Workspace.ownerId` is
 * `onDelete: Restrict`, deletion would fail at the DB anyway; we raise
 * a user-facing error up front so better-auth can surface the
 * blocking-workspace list before destroying session cookies.
 */
export class AssertUserCanBeDeletedService {
  constructor(
    private readonly listBlocking: ListBlockingOwnedWorkspacesService,
  ) {}

  async execute(userId: UserId): Promise<void> {
    const { workspaces } = await this.listBlocking.execute(userId);
    if (workspaces.length === 0) return;
    throw new DomainError(
      "account.delete.sole_owner",
      "You are the sole owner of one or more workspaces. Transfer or delete them before deleting your account.",
      { blockingWorkspaces: workspaces },
    );
  }
}
```

**NOTE:** Adjust the `DomainError` constructor call to match the signature in `apps/api/src/kernel/errors.ts`. Inspect it first; you may need `DomainError.with(...)` or different argument order. The test's `.details` assertion assumes the error exposes a `details` / `data` property — align the assertion and the error to match your codebase's convention.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test --workspace @orbit/api -- assert-user-can-be-deleted`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/identity/application/assert-user-can-be-deleted.service.ts apps/api/src/identity/application/assert-user-can-be-deleted.service.test.ts
git commit -m "feat(api): assert user can be deleted (blocks sole workspace owners)"
```

---

## Task 5: Register services in identity feature and DI container

**Files:**
- Modify: `apps/api/src/identity/feature.ts`
- Modify: `apps/api/src/composition.ts`

- [ ] **Step 1: Register services in identity feature**

Open `apps/api/src/identity/feature.ts` and add imports + services:

```ts
import { ListBlockingOwnedWorkspacesService } from "@/identity/application/list-blocking-owned-workspaces.service.ts";
import { AssertUserCanBeDeletedService } from "@/identity/application/assert-user-can-be-deleted.service.ts";

export interface IdentityServices {
  getMe: GetMeService;
  updatePreferences: UpdatePreferencesService;
  listBlockingOwnedWorkspaces: ListBlockingOwnedWorkspacesService;
  assertUserCanBeDeleted: AssertUserCanBeDeletedService;
}

export const identityFeature: FeatureModule<IdentityServices> = {
  name: "identity",
  services: (core) => {
    const listBlockingOwnedWorkspaces = new ListBlockingOwnedWorkspacesService(core.uow);
    const assertUserCanBeDeleted = new AssertUserCanBeDeletedService(listBlockingOwnedWorkspaces);
    return {
      getMe: new GetMeService(core.uow),
      updatePreferences: new UpdatePreferencesService(core.uow, core.clock),
      listBlockingOwnedWorkspaces,
      assertUserCanBeDeleted,
    };
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace @orbit/api`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/identity/feature.ts
git commit -m "feat(api): register account-deletion services in identity feature"
```

---

## Task 6: Wire better-auth changeEmail + deleteUser

**Files:**
- Modify: `apps/api/src/interfaces/http/better-auth.ts`
- Modify: `apps/api/src/composition.ts`

- [ ] **Step 1: Extend BetterAuthConfig with a hooks field**

Open `apps/api/src/interfaces/http/better-auth.ts`. Add to `BetterAuthConfig`:

```ts
/** Optional hook called before better-auth destroys a user. Throws to block. */
accountHooks?: {
  assertUserCanBeDeleted?: (userId: string) => Promise<void>;
};
```

- [ ] **Step 2: Enable changeEmail + deleteUser in `betterAuth(...)`**

Inside `buildBetterAuth`, inside the config object passed to `betterAuth(...)`, add:

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
    beforeDelete: async (user) => {
      if (config.accountHooks?.assertUserCanBeDeleted) {
        await config.accountHooks.assertUserCanBeDeleted(user.id);
      }
    },
    sendDeleteAccountVerification: async ({ user, url }) => {
      await mailer.sendAccountDeletionVerification({
        to: user.email,
        link: url,
      });
    },
  },
},
```

Place this block next to the existing `emailAndPassword` / `plugins` fields (top-level in the `betterAuth(...)` object).

- [ ] **Step 3: Pass the hook from composition**

Open `apps/api/src/composition.ts`. Find the call to `buildBetterAuth(...)`. Add an `accountHooks` property:

```ts
accountHooks: {
  assertUserCanBeDeleted: (userId) =>
    services.assertUserCanBeDeleted.execute(userId as UserId),
},
```

If the call site constructs the config object inline, adjust accordingly. Note that `services` must be built **before** `buildBetterAuth` for this to work — check ordering with `grep -n "buildBetterAuth\|services" apps/api/src/composition.ts` and re-order if needed. If ordering makes this hard, wrap the callback in a thunk that reads from a late-bound reference:

```ts
let servicesRef: AppServices | null = null;
// ...build auth with accountHooks that reads from servicesRef...
servicesRef = services; // after services is built
```

Pick whichever is cleaner for the existing structure.

- [ ] **Step 4: Typecheck + run API tests**

Run: `npm run typecheck --workspace @orbit/api && npm run test --workspace @orbit/api`
Expected: both PASS

- [ ] **Step 5: Start the API and smoke-test change-email**

Run (in a separate terminal): `npm run dev:api`

Then (as a signed-in user in dev, cookie in hand — easiest is to use the browser after starting `npm run dev` and signing in, then watch the API logs):
- In the web app console in DevTools: `await authClient.changeEmail({ newEmail: "new@example.com", callbackURL: "/account?emailChanged=1" })`
- Expected: API logs `[mailer] change-email verification → new@example.com (current: <old>)` with a link.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/interfaces/http/better-auth.ts apps/api/src/composition.ts
git commit -m "feat(api): enable better-auth change-email and delete-user flows"
```

---

## Task 7: `GET /v1/me/owned-workspaces-blocking-delete` endpoint

**Files:**
- Create: `apps/api/src/interfaces/http/controllers/me.account.controller.ts`
- Modify: `apps/api/src/interfaces/http/router.ts`

- [ ] **Step 1: Inspect the existing `me.preferences.controller.ts` for route shape**

Run: `cat apps/api/src/interfaces/http/controllers/me.preferences.controller.ts | head -30`
Expected: see the `Hono<HonoEnv>` + `requireSession` pattern.

- [ ] **Step 2: Create the controller**

```ts
import { Hono } from "hono";
import { requireSession } from "../middleware/session.ts";
import type { HonoEnv } from "../middleware/container.ts";
import type { UserId } from "@/identity/domain/user.ts";

export const meAccount = new Hono<HonoEnv>();

meAccount.get("/owned-workspaces-blocking-delete", async (c) => {
  const container = c.get("container");
  const session = requireSession(c);
  const result = await container.services.listBlockingOwnedWorkspaces.execute(
    session.userId as UserId,
  );
  c.get("log")?.set({
    action: "me.ownedWorkspacesBlockingDelete",
    count: result.workspaces.length,
  });
  return c.json(result);
});
```

- [ ] **Step 3: Mount the controller**

Open `apps/api/src/interfaces/http/router.ts`. Next to the existing `v1.route("/me/preferences", mePreferences);` line, add:

```ts
import { meAccount } from "./controllers/me.account.controller.ts";
// ...
v1.route("/me", meAccount);
```

If `/me` is already routed to something else, use `/me/account` as the mount point and update the controller's route path accordingly.

- [ ] **Step 4: Smoke test**

Run (in a separate terminal): `npm run dev:api`

Then, signed in:
```
curl -s -b <session-cookie> http://localhost:4002/v1/me/owned-workspaces-blocking-delete
```
Expected: `{"workspaces":[...]}` with an array of workspaces the user owns.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/interfaces/http/controllers/me.account.controller.ts apps/api/src/interfaces/http/router.ts
git commit -m "feat(api): GET /v1/me/owned-workspaces-blocking-delete"
```

---

## Task 8: Shared react-query options for account page

**Files:**
- Create: `apps/web-next/src/lib/queries/account.ts`
- Create: `apps/web-tanstack/src/lib/queries/account.ts`

- [ ] **Step 1: Inspect existing query options file for shape**

Run: `ls apps/web-next/src/lib/queries/ && cat apps/web-next/src/lib/queries/session.ts | head -40`
Expected: see how `queryOptions` + the API client is used.

- [ ] **Step 2: Write `account.ts` (web-next)**

```ts
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export interface BlockingOwnedWorkspace {
  id: string;
  name: string;
  slug: string;
}

export const blockingOwnedWorkspacesQueryOptions = queryOptions({
  queryKey: ["me", "blocking-owned-workspaces"] as const,
  queryFn: async (): Promise<{ workspaces: BlockingOwnedWorkspace[] }> => {
    return apiFetch("/v1/me/owned-workspaces-blocking-delete");
  },
});
```

Adjust the `apiFetch` import to match what's already used in the `queries` folder. If the repo uses a different client helper, use that.

- [ ] **Step 3: Mirror for web-tanstack**

Same file contents, but update the import path (`@/lib/api/client` points to the same client pattern in web-tanstack).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace @orbit/web-next && npm run typecheck --workspace @orbit/web-tanstack`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web-next/src/lib/queries/account.ts apps/web-tanstack/src/lib/queries/account.ts
git commit -m "feat(web): query options for account page blocking-workspaces"
```

---

## Task 9: ProfileSection component (web-next)

**Files:**
- Create: `apps/web-next/src/views/account/profile-section.tsx`

- [ ] **Step 1: Inspect existing settings section for component primitives**

Run: `cat apps/web-next/src/views/workspace-settings/general-page.tsx | head -80`
Expected: see how form inputs from `@orbit/ui` are used (typical imports: `Input`, `Button`, `Label`).

- [ ] **Step 2: Write the section**

```tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import { authClient } from "@/lib/auth-client";
import { useMeUser } from "@/lib/use-me-user";
import { meQueryOptions } from "@/lib/queries/session";

export function ProfileSection(): React.ReactElement | null {
  const me = useMeUser();
  const qc = useQueryClient();
  const [name, setName] = useState(me?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;

  async function onSave() {
    setSaving(true);
    setError(null);
    const res = await authClient.updateUser({ name });
    if (res.error) {
      setError(res.error.message ?? "Could not save name");
    } else {
      await qc.invalidateQueries({ queryKey: meQueryOptions.queryKey });
    }
    setSaving(false);
  }

  const dirty = name.trim().length > 0 && name !== me.name;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Update your display name.</p>
      </header>
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="account-name">Name</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={!dirty || saving} onClick={onSave}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace @orbit/web-next`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web-next/src/views/account/profile-section.tsx
git commit -m "feat(web-next): account profile section"
```

---

## Task 10: EmailSection component (web-next)

**Files:**
- Create: `apps/web-next/src/views/account/email-section.tsx`

- [ ] **Step 1: Write the section**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import { authClient } from "@/lib/auth-client";
import { useMeUser } from "@/lib/use-me-user";

export function EmailSection(): React.ReactElement | null {
  const me = useMeUser();
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!me) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed || trimmed === me.email) return;
    setStatus("sending");
    setError(null);
    const res = await authClient.changeEmail({
      newEmail: trimmed,
      callbackURL: "/account?emailChanged=1",
    });
    if (res.error) {
      setError(res.error.message ?? "Could not send verification");
      setStatus("idle");
    } else {
      setSentTo(trimmed);
      setStatus("sent");
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">Email</h2>
        <p className="text-sm text-muted-foreground">
          Current email: <span className="font-mono">{me.email}</span>
        </p>
      </header>
      {status === "sent" && sentTo ? (
        <p className="text-sm">
          Check your inbox at <strong>{sentTo}</strong> to confirm the change.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 max-w-sm">
          <Label htmlFor="new-email">New email</Label>
          <Input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@newdomain.com"
            required
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={status === "sending" || !newEmail.trim()}>
            {status === "sending" ? "Sending…" : "Send verification link"}
          </Button>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace @orbit/web-next`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web-next/src/views/account/email-section.tsx
git commit -m "feat(web-next): account email section"
```

---

## Task 11: SessionsSection component (web-next)

**Files:**
- Create: `apps/web-next/src/views/account/sessions-section.tsx`

- [ ] **Step 1: Write the section**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@orbit/ui/button";
import { authClient } from "@/lib/auth-client";

interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

function formatAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  // Minimal extraction; better-auth returns full UA strings.
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Browser";
}

export function SessionsSection(): React.ReactElement {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const [list, session] = await Promise.all([
      authClient.listSessions(),
      authClient.getSession(),
    ]);
    setSessions((list.data ?? []) as SessionRow[]);
    setCurrentToken(session.data?.session?.token ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function revoke(token: string) {
    setBusy(token);
    await authClient.revokeSession({ token });
    await refresh();
    setBusy(null);
  }

  async function revokeOthers() {
    setBusy("others");
    await authClient.revokeOtherSessions();
    await refresh();
    setBusy(null);
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">Active sessions</h2>
        <p className="text-sm text-muted-foreground">
          Devices currently signed in to your account.
        </p>
      </header>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !sessions || sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active sessions.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {sessions.map((s) => {
            const isCurrent = s.token === currentToken;
            return (
              <li key={s.id} className="flex items-center justify-between p-3">
                <div className="space-y-0.5 text-sm">
                  <div className="font-medium">
                    {formatAgent(s.userAgent)}{" "}
                    {isCurrent ? (
                      <span className="ml-1 text-xs text-primary">(current)</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.ipAddress ?? "IP unknown"} · last active{" "}
                    {new Date(s.updatedAt).toLocaleString()}
                  </div>
                </div>
                {!isCurrent ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === s.token}
                    onClick={() => revoke(s.token)}
                  >
                    {busy === s.token ? "Signing out…" : "Sign out"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {sessions && sessions.length > 1 ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy === "others"}
          onClick={revokeOthers}
        >
          {busy === "others" ? "Signing out…" : "Sign out of all other sessions"}
        </Button>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace @orbit/web-next`
Expected: PASS. If `listSessions` / `revokeSession` method names differ in the installed `better-auth` version, check with `grep -rn "listSessions\|revokeSession\|revokeOtherSessions" node_modules/better-auth/dist/client | head` and adjust.

- [ ] **Step 3: Commit**

```bash
git add apps/web-next/src/views/account/sessions-section.tsx
git commit -m "feat(web-next): account sessions section"
```

---

## Task 12: DangerZoneSection component (web-next)

**Files:**
- Create: `apps/web-next/src/views/account/danger-zone-section.tsx`

- [ ] **Step 1: Look at the existing confirm-dialog pattern**

Run: `grep -rn "AlertDialog\|Dialog\|ConfirmDialog" apps/web-next/src apps/web-tanstack/src packages/ui/src 2>/dev/null | head -10`
Expected: see the repo's dialog primitive. Use it for the confirm modal.

- [ ] **Step 2: Write the section**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@orbit/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { useMeUser } from "@/lib/use-me-user";
import { blockingOwnedWorkspacesQueryOptions } from "@/lib/queries/account";

export function DangerZoneSection(): React.ReactElement | null {
  const me = useMeUser();
  const { data, isLoading } = useQuery(blockingOwnedWorkspacesQueryOptions);
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;
  const blocking = data?.workspaces ?? [];
  const blocked = blocking.length > 0;

  async function confirmDelete() {
    setStatus("sending");
    setError(null);
    const res = await authClient.deleteUser({
      callbackURL: "/?accountDeleted=1",
    });
    if (res.error) {
      setError(res.error.message ?? "Could not send deletion link");
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <section className="space-y-4 rounded-md border border-destructive/30 p-4">
      <header>
        <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Checking workspace ownership…</p>
      ) : blocked ? (
        <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
          <p className="font-medium">
            You own {blocking.length} workspace{blocking.length === 1 ? "" : "s"} and
            must transfer or delete {blocking.length === 1 ? "it" : "them"} before
            deleting your account:
          </p>
          <ul className="list-disc pl-5">
            {blocking.map((ws) => (
              <li key={ws.id}>
                <Link className="underline" href={`/d/${ws.slug}`}>
                  {ws.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={blocked || isLoading}>
            Delete account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This deletes your account, your workspace memberships, and any
              workspace where you are the only member. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {status === "sent" ? (
            <p className="text-sm">
              We sent a confirmation link to <strong>{me.email}</strong>. Click it to
              finish deleting your account.
            </p>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="confirm-email">
                Type your email to confirm: <span className="font-mono">{me.email}</span>
              </Label>
              <Input
                id="confirm-email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          )}
          <DialogFooter>
            {status === "sent" ? (
              <Button onClick={() => setOpen(false)}>Close</Button>
            ) : (
              <Button
                variant="destructive"
                disabled={confirmEmail.trim() !== me.email || status === "sending"}
                onClick={confirmDelete}
              >
                {status === "sending" ? "Sending…" : "Send deletion link"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace @orbit/web-next`
Expected: PASS. If `@orbit/ui/dialog` exports differ, inspect with `grep -n "^export" packages/ui/src/dialog.tsx` (or wherever the dialog lives) and adjust import/usage.

- [ ] **Step 4: Commit**

```bash
git add apps/web-next/src/views/account/danger-zone-section.tsx
git commit -m "feat(web-next): account danger zone (delete account)"
```

---

## Task 13: Account page view + route (web-next)

**Files:**
- Create: `apps/web-next/src/views/account/account-page.tsx`
- Create: `apps/web-next/src/app/account/layout.tsx`
- Create: `apps/web-next/src/app/account/page.tsx`

- [ ] **Step 1: Inspect how authenticated routes redirect unauth users**

Run: `grep -rn "redirect\|requireSession\|useSession" apps/web-next/src/app 2>/dev/null | head -15`
Expected: see the existing auth gate pattern.

- [ ] **Step 2: Write `account-page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ProfileSection } from "./profile-section";
import { EmailSection } from "./email-section";
import { SessionsSection } from "./sessions-section";
import { DangerZoneSection } from "./danger-zone-section";

export function AccountPage({ backHref }: { backHref: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Link>
        <h1 className="text-2xl font-semibold">Account settings</h1>
      </header>
      <ProfileSection />
      <EmailSection />
      <SessionsSection />
      <DangerZoneSection />
    </div>
  );
}
```

- [ ] **Step 3: Write the layout**

```tsx
// apps/web-next/src/app/account/layout.tsx
import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
```

- [ ] **Step 4: Write the page**

```tsx
// apps/web-next/src/app/account/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AccountPage } from "@/views/account/account-page";

export default function AccountRoute() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login?next=/account");
    }
  }, [isPending, session, router]);

  if (isPending || !session?.user) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  // Determine a reasonable "back" target. If we have a last-visited
  // workspace slug in storage, route there; otherwise fall back to "/".
  let backHref = "/";
  if (typeof window !== "undefined") {
    const last = window.localStorage.getItem("orbit:lastWorkspaceSlug");
    if (last) backHref = `/d/${last}`;
  }

  return <AccountPage backHref={backHref} />;
}
```

If `orbit:lastWorkspaceSlug` isn't already a thing in the codebase, that's fine — this falls back to `/` gracefully. If the app already has a "last workspace" hook, prefer that.

- [ ] **Step 5: Run the dev server and visit `/account`**

Run: `npm run dev:web` (or `npm run dev`).

Navigate to `http://localhost:4003/account` (web-next's dev port; confirm by checking `apps/web-next/package.json` "dev" script). Sign in first if needed.

Expected: page renders with four sections. Try:
- Changing name and saving → success.
- Entering a new email → "Check your inbox" message; API logs the link.
- Seeing the current session in the list (badge visible).
- Danger zone: if you own a workspace, the list is shown and the button is disabled. Otherwise the button opens a dialog.

- [ ] **Step 6: Commit**

```bash
git add apps/web-next/src/views/account/account-page.tsx apps/web-next/src/app/account/layout.tsx apps/web-next/src/app/account/page.tsx
git commit -m "feat(web-next): /account page with profile, email, sessions, danger zone"
```

---

## Task 14: Mirror all four sections + page for web-tanstack

**Files:**
- Create: `apps/web-tanstack/src/views/account/account-page.tsx`
- Create: `apps/web-tanstack/src/views/account/profile-section.tsx`
- Create: `apps/web-tanstack/src/views/account/email-section.tsx`
- Create: `apps/web-tanstack/src/views/account/sessions-section.tsx`
- Create: `apps/web-tanstack/src/views/account/danger-zone-section.tsx`
- Create: `apps/web-tanstack/src/routes/account.tsx`

- [ ] **Step 1: Copy the four section components from web-next**

Copy each file from `apps/web-next/src/views/account/*.tsx` to the corresponding path in `apps/web-tanstack/src/views/account/*.tsx`.

Remove the `"use client"` directive from each (TanStack Start doesn't use it).

Replace `next/link` with `@tanstack/react-router`'s `Link`:

```tsx
// before
import Link from "next/link";
// after
import { Link } from "@tanstack/react-router";
// and replace <Link href="..."> with <Link to="...">
```

Replace any `useRouter` from `next/navigation` — not used in these section components, so no change required there.

- [ ] **Step 2: Copy account-page.tsx**

Copy `apps/web-next/src/views/account/account-page.tsx` to `apps/web-tanstack/src/views/account/account-page.tsx`. Remove `"use client"`, switch `next/link` → `@tanstack/react-router` Link (`to` instead of `href`).

- [ ] **Step 3: Create the TanStack route**

Inspect existing routes: `cat apps/web-tanstack/src/routes/_auth.tsx | head -40`

Create `apps/web-tanstack/src/routes/account.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { AccountPage } from "@/views/account/account-page";

export const Route = createFileRoute("/account")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: "/login", search: { next: "/account" } });
    }
  },
  component: AccountRoute,
});

function AccountRoute() {
  let backHref = "/";
  if (typeof window !== "undefined") {
    const last = window.localStorage.getItem("orbit:lastWorkspaceSlug");
    if (last) backHref = `/d/${last}`;
  }
  return <AccountPage backHref={backHref} />;
}
```

If the `/login` route doesn't accept a `next` search param, drop the `search` field; the redirect after sign-in is a separate concern.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace @orbit/web-tanstack`
Expected: PASS. TanStack routes auto-register via file discovery; a `routeTree.gen.ts` file may need regeneration — run `npm run dev:web` (or the specific tanstack dev command) once to regenerate.

- [ ] **Step 5: Smoke test**

Run: the web-tanstack dev server. Navigate to `/account`. Same checks as Task 13 Step 5.

- [ ] **Step 6: Commit**

```bash
git add apps/web-tanstack/src/views/account apps/web-tanstack/src/routes/account.tsx apps/web-tanstack/src/routeTree.gen.ts
git commit -m "feat(web-tanstack): /account page with profile, email, sessions, danger zone"
```

---

## Task 15: Add "Account settings" link to UserMenu in both apps

**Files:**
- Modify: `apps/web-next/src/components/user-menu.tsx`
- Modify: `apps/web-tanstack/src/components/user-menu.tsx`

- [ ] **Step 1: Add the link to web-next UserMenu**

Open `apps/web-next/src/components/user-menu.tsx`. Import `UserIcon` alongside the existing lucide imports:

```ts
import { ChevronsUpDownIcon, LogOutIcon, Moon, RefreshCcwIcon, Sun, UserIcon } from "lucide-react";
```

Add `Link` import:

```ts
import Link from "next/link";
```

Inside the `MenuPopup`, add a new `MenuItem` rendered as a Link, above the "Sign out" item (in a new `MenuGroup` separated by a `MenuSeparator`, or inside the existing bottom group — match the style of other items):

```tsx
<MenuSeparator />
<MenuGroup>
  <MenuItem render={<Link href="/account" />}>
    <UserIcon />
    <span>Account settings</span>
  </MenuItem>
  <MenuItem onClick={() => { onReset(); }}>
    <LogOutIcon />
    <span>Sign out</span>
  </MenuItem>
</MenuGroup>
```

Remove the duplicate sign-out item from the earlier block so the file has a single sign-out MenuItem.

- [ ] **Step 2: Mirror in web-tanstack**

Open `apps/web-tanstack/src/components/user-menu.tsx`. Same changes, but:

```ts
import { Link } from "@tanstack/react-router";
```

And the MenuItem render prop:

```tsx
<MenuItem render={<Link to="/account" />}>
  <UserIcon />
  <span>Account settings</span>
</MenuItem>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS across all workspaces.

- [ ] **Step 4: Smoke test**

Run: `npm run dev`. Sign in. Open the user menu in the sidebar footer. Click "Account settings". Confirm navigation works in both apps.

- [ ] **Step 5: Commit**

```bash
git add apps/web-next/src/components/user-menu.tsx apps/web-tanstack/src/components/user-menu.tsx
git commit -m "feat(web): add Account settings to user menu"
```

---

## Task 16: End-to-end manual QA + bug-fix pass

**Files:** any, as needed.

- [ ] **Step 1: Profile flow**

Sign in (both apps). Go to `/account`. Change name. Save. Reload. Confirm sidebar footer shows the new name.

- [ ] **Step 2: Email-change flow**

Submit a new email. Check `npm run dev:api` logs for `[mailer] change-email verification`. Open the link in the log. Expect DB `User.email` to update — verify by reloading `/account` and seeing the new current email.

- [ ] **Step 3: Sessions flow**

Sign in from a second browser / incognito. Reload `/account`. Confirm two sessions listed. Click "Sign out" on the other session — reload the incognito window to confirm it's signed out.

- [ ] **Step 4: Delete with blocking workspaces**

As a user who owns a workspace, open danger zone. Confirm workspace list is shown and the button is disabled.

- [ ] **Step 5: Delete without blocking workspaces**

Transfer ownership via SQL or use a user who owns nothing. Click "Delete account". Type email. Click "Send deletion link". Check API logs for `[mailer] account-deletion verification`. Open the link. Expect redirect to `/?accountDeleted=1` and the user row gone from DB.

- [ ] **Step 6: Delete where the user is the only member of an owned workspace**

(Only reachable if you wire transfer-or-cascade later; for v1 this is blocked by Step 4.)

- [ ] **Step 7: Fix any bugs found**

Commit each fix separately with a descriptive message.

---

## Self-Review Checklist (run before handing off)

- [ ] Every task has concrete code or commands, no placeholders.
- [ ] `DomainError` usage in Task 4 matches the actual constructor signature in `apps/api/src/kernel/errors.ts` (confirm when implementing; the plan tells the implementer to verify).
- [ ] Service names consistent: `listBlockingOwnedWorkspaces`, `assertUserCanBeDeleted` used identically in `feature.ts`, controller, and better-auth config.
- [ ] Dev ports: web-next is 4003 (per CLAUDE.md), web-tanstack is 4001. Smoke-test steps don't hard-code wrong ports.
- [ ] Mirrors for `apps/web-tanstack` are explicit, not "same as above".
- [ ] No task requires a DB migration (we did not add any columns or tables).
