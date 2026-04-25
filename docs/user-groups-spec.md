# Spec: User Groups (@foundation, @everyone, @here)

**Status:** Draft — ready for P1.
**Owner:** Product + web + API
**Related:** `send-message.service.ts` mention resolver, `NotificationProjector`, `NotificationMentionGroup`, `MentionChip`, `remarkMentions`, realtime hub presence

---

## 1. Problem

Today every `@mention` is a 1:1 ping at a specific `WorkspaceMember`. When a room has a recurring subgroup ("the foundation engineers", "on-call", "design crit"), the author has to type `@alex @blake @casey` by hand — error-prone, loses intent ("this is for the founding team"), and leaves recipients with no breadcrumb in their inbox explaining _why_ they got pinged versus everyone else.

Slack solves this with **User groups** (internally "subteams"). Orbit adopts the same primitive plus two reserved broadcast tokens (`@everyone`, `@here`) so authors can address rooms, not just people.

---

## 2. Goals

| Goal | Notes |
| --- | --- |
| **G1** One handle, many people. `@foundation` expands to the current member set at send time. | Group membership is mutable; messages always resolve against "now", not history. |
| **G2** Recipients keep a clear "why" trail. | Inbox shows `Alex · via @foundation` for indirect pings; direct mentions drop the `via`. |
| **G3** `@everyone` / `@here` are first-class, distinct from custom groups. | Separate policy, no DB rows, always live against room membership / presence. |
| **G4** Composer tells you what you're about to do before you hit enter. | Inline "12 people will be notified" caption; large-fan-out confirm. |
| **G5** Don't smash the existing inbox grouping behavior. | Group / builtin mentions bump the same `NotificationMentionGroup` buckets; only the presentation diverges. |
| **G6** Symmetric with existing mention pipeline. | Reuse `parseMentions`, `MentionConfirmDialog`, `MentionChip`, `remarkMentions` — no parallel code path. |

**Non-goals (v1):** nested groups; cross-workspace groups; group-level ACLs on specific rooms; `@here` presence durability beyond the realtime hub; email/push copy (groups are inbox-only until those channels ship).

---

## 3. Current behavior (baseline)

- `send-message.service.ts` parses `@handle` tokens with `/@([a-z0-9._-]+)/gi`, resolves each against `WorkspaceMember` email-local and name-slug, filters to room members, and emits `MessageSent.mentionsMemberIds`.
- `NotificationProjector` fans each mention into either a per-message `Notification` (DMs) or a `NotificationMentionGroup` bucket (non-DMs).
- Web composer uses `@tiptap/extension-mention` with `filterMembersForMention`; rendered messages rewrite `@handle` via `remarkMentions` into `<MentionChip />`.
- No notion of "group membership" beyond `RoomMember` / `WorkspaceMember`.

---

## 4. Proposed product behavior

### 4.1 Custom user groups

A **UserGroup** is a named, handle-addressable set of `WorkspaceMember`s, scoped to one workspace.

| Field | Rule |
| --- | --- |
| `handle` | Lowercased, matches `/^[a-z0-9._-]+$/`. Unique per workspace. Rejected if it collides with the current `primaryMentionHandle` of any workspace member **or** with a reserved builtin (`everyone`, `here`). Collision at resolve-time (after a rename) is won by the group — messages always render the group chip. |
| `name` | Display name, e.g. `"Foundation"`. |
| `description` | Optional. Shown in admin UI and in the expanded-members popover. |
| `tone` | Palette index for chip color, mirroring `WorkspaceMember.tone`. |
| `members` | 1+ `WorkspaceMember`s. Empty groups are allowed but render as a dimmed chip and notify no one. |
| Lifecycle | Soft-archived via `archivedAt`. Archived groups stop appearing in composer suggestions but still render as `@foundation` (dimmed) in historical messages so the audit trail is honest. |

**Permissions (v1):**

| Action | Allowed by |
| --- | --- |
| Create group | Workspace `OWNER` |
| Rename / edit members / edit description | Workspace `OWNER` |
| Archive / delete | Workspace `OWNER` |
| Mention a group | Any workspace member who can see the room |

Relax creation to `MEMBER` via a workspace setting once we see real usage.

**Visibility:** groups and their member lists are workspace-public. We're not trying to support "secret" groups in v1; the risk of `@private-team` appearing and leaking a roster is bigger than the reward.

### 4.2 Reserved broadcast tokens

`@everyone` and `@here` are **not** `UserGroup` rows. They're reserved tokens handled by the mention resolver.

| Token | Expands to | Allowed in | Auto-add to room? |
| --- | --- | --- | --- |
| `@everyone` | All `RoomMember`s of the target room, minus the author | Non-DM rooms + threads | **Never.** Always strictly the current room membership. |
| `@here` | `RoomMember`s the realtime hub reports as online, minus the author | Non-DM rooms + threads | **Never.** |
| Either | (noop in DMs — rendered as plaintext, no notifications) | — | — |

**Rename protection:** `RESERVED_MENTION_HANDLES = ["everyone", "here"]` lives in `packages/shared/src/mentions.ts` and is enforced at `UserGroup` create/rename.

**Hard cap:** if `@everyone` (or any single group) expands to more than 25 recipients, the send is gated by the confirm dialog (§4.5). Tunable per workspace later (`Workspace.largeMentionThreshold`, default 25).

### 4.3 Mention resolution order

In `send-message.service.ts`, after tokens are parsed:

1. For each token, test against `RESERVED_MENTION_HANDLES` → expand to room members (or online members for `@here`).
2. Otherwise test against `UserGroup.handle` for this workspace → expand to group members.
3. Otherwise test against user handle / name-slug (existing logic).
4. Merge into a `Set<WorkspaceMemberId>`, dropping the author.
5. Filter to members who are currently in the room (existing behavior — non-members get pulled in via `MentionConfirmDialog`).

The result is the usual `mentionsMemberIds: WorkspaceMemberId[]` plus a new sibling:

```ts
type MentionReason = {
  direct: boolean;                              // token matched the user's own handle
  viaUserGroupIds: readonly UserGroupId[];      // groups this user came from
  viaBuiltin: MentionBuiltin | null;            // EVERYONE | HERE | null
};

type MentionResolution = {
  memberIds: readonly WorkspaceMemberId[];
  reasonByMemberId: ReadonlyMap<WorkspaceMemberId, MentionReason>;
  referencedGroupIds: readonly UserGroupId[];   // distinct groups present in the message
  referencedBuiltins: readonly MentionBuiltin[]; // distinct builtins present
};
```

This flows onto `MessageSent` so the projector has everything it needs without re-parsing.

### 4.4 Composer UX

**Suggestion list** (`mention-extension.ts`):

- Unified ranked list of `{ kind: "user", member } | { kind: "group", group, memberCount } | { kind: "builtin", token, expandedCount }`.
- Groups sort one step ahead of users at equal score (they carry more intent).
- Builtins are ranked last but always visible at the top when the query is empty — "low-friction discoverability, explicit intent required."
- Each row shows its live member count: `@foundation · 3 people`, `@here · 11 online now`, `@everyone · 32 in this room`.

**Draft caption** (new composer footer line):

- When the draft contains any group or builtin mention, show a muted mono caption:
  `@foundation (3) · @here (11) — 12 people will be notified`
- Counts are deduped across tokens.
- Clicking expands a popover listing the resolved members, so the sender can sanity-check before hitting enter.
- Disappears when the draft has no group/builtin mentions.

### 4.5 Confirm dialogs

Two confirm surfaces, both reusing `MentionConfirmDialog`:

| Trigger | Dialog variant |
| --- | --- |
| Mentioned members who aren't in this room (existing) | `"Also add 3 people to #ops?"` — unchanged, except when a group triggered the add the list is grouped under the group's name: `"3 from @foundation not in this room"`. |
| Fan-out exceeds the threshold (new) | `"You're about to notify 32 people in #ops."` with a per-person list (avatar + name + source token). Actions: `Send anyway` / `Keep editing`. |

`@everyone` never auto-adds anyone (expansion is bounded by room membership), so it only ever hits the second dialog.

### 4.6 Inbox presentation

`NotificationMentionGroup` buckets are bumped exactly as today, plus three new columns (see §5). Inbox row rendering:

| Bucket state | Copy |
| --- | --- |
| `directMention: true` | `Alex Chen` / `#ops · 5 mentions today` (unchanged) |
| `directMention: false && viaUserGroupIds.length > 0` | `Alex Chen` / `#ops · via @foundation` / `5 mentions today` |
| `directMention: false && viaBuiltin: "EVERYONE"` | `Alex Chen` / `#ops · via @everyone` / `5 mentions today` |
| `directMention: false && viaBuiltin: "HERE"` | `Alex Chen` / `#ops · via @here` / `5 mentions today` |
| Multiple `viaUserGroupIds` on one bucket | `via @foundation +2` (tooltip lists all) |

Rule: **if `directMention: true`, never show `via`.** A mixed bucket (someone was in `@foundation` _and_ directly tagged) shouldn't read as "indirect" — the direct ping wins the header.

### 4.7 Chip rendering

`MentionChip` grows two new variants:

| Kind | Treatment |
| --- | --- |
| `user` (existing) | Avatar + name, tone ring. |
| `group` | Monogram from the group's `name`, tone ring, subtle "people" indicator (e.g. a small stacked-dot glyph). Tooltip shows member list. |
| `builtin` | Text-only pill, no avatar, small leading dot indicator. `@everyone` and `@here` get distinct but equally "broadcast-y" treatments. |

`remarkMentions` passes `data-mention-kind="user" \| "group" \| "builtin"` so `message-body.tsx` picks the right variant. It reads the group map (and reserved-handle list) from a plugin option populated by the workspace context.

### 4.8 Settings (v2, but design for it now)

| Setting | Storage | Values |
| --- | --- | --- |
| Per-user "mute indirect mentions" | `WorkspaceMember.preferences` (new JSON column, or reuse existing if present) | `indirectMentionsAsUnread: boolean` — when true, indirect-only mention buckets don't increment the nav `@N` badge. Inbox still shows them. |
| Per-room "allow global mentions" | `Room.allowGlobalMentions` (default `true`) | Admins can disable `@everyone` / `@here` in specific rooms. |
| Per-workspace "who can create groups" | `Workspace.groupCreationPolicy` | `OWNERS_ONLY` (default) / `ANY_MEMBER`. |

Pre-build the `directMention` column in v1 — the mute setting becomes a trivial `WHERE directMention = true` later with zero migration.

---

## 5. Data model

New tables and columns. Diff is additive; no existing data rewrites.

### 5.1 `UserGroup` + `UserGroupMember`

```prisma
model UserGroup {
  id           String    @id              // ugrp_*
  workspaceId  String
  handle       String                     // lowercased, unique per workspace
  name         String
  description  String?
  tone         Int       @default(0)
  createdById  String
  createdAt    DateTime  @default(now())
  archivedAt   DateTime?

  workspace  Workspace         @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy  WorkspaceMember   @relation("UserGroupCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  members    UserGroupMember[]

  @@unique([workspaceId, handle])
  @@index([workspaceId])
  @@map("user_groups")
}

model UserGroupMember {
  id                String   @id           // ugrpm_*
  userGroupId       String
  workspaceMemberId String
  addedAt           DateTime @default(now())

  userGroup       UserGroup       @relation(fields: [userGroupId], references: [id], onDelete: Cascade)
  workspaceMember WorkspaceMember @relation(fields: [workspaceMemberId], references: [id], onDelete: Cascade)

  @@unique([userGroupId, workspaceMemberId])
  @@index([workspaceMemberId])
  @@map("user_group_members")
}
```

ID prefixes added in `packages/shared/src/ids.ts`:

- `ugrp_` → `UserGroupId`
- `ugrpm_` → `UserGroupMemberId`

### 5.2 `NotificationMentionGroup` delta

```prisma
enum MentionBuiltin {
  EVERYONE
  HERE
}

// Added to NotificationMentionGroup:
viaUserGroupIds  String[]           @default([])
viaBuiltin       MentionBuiltin?
directMention    Boolean            @default(true)
```

**Upsert semantics** on bump:

- `viaUserGroupIds`: `array_distinct(array_cat(existing, new))`.
- `viaBuiltin`: precedence `EVERYONE > HERE > null`. `EVERYONE` sticks once set.
- `directMention`: `existing OR new` (monotonic: once a direct ping lands in the bucket, the bucket is "direct" for the rest of the day).

### 5.3 `Notification` delta (DM path, optional in v1)

```prisma
viaUserGroupId  String?
viaBuiltin      MentionBuiltin?
```

Groups are unusual in DMs (a DM mentioning `@foundation` is mostly pathological), but keeping the columns available means the DM path can render the `via` suffix consistently without a second migration. Nullable, no backfill required.

### 5.4 Shared module

New file `packages/shared/src/mentions.ts`:

- `RESERVED_MENTION_HANDLES: ReadonlySet<string>` — `{ "everyone", "here" }`.
- `MENTION_HANDLE_RE: RegExp` — canonical `/@([a-z0-9._-]+)/gi`. Replaces the duplicated copies in `send-message.service.ts`, `remark-mentions.ts`, and `mention-utils.ts`.
- `isReservedMentionHandle(handle: string): boolean`.
- `MentionBuiltin` DTO alias matching the Prisma enum.

This is small but worth doing as part of P1 — it's the single source of truth we'll be auditing against every time someone touches mention parsing.

---

## 6. API surface

REST, consistent with existing workspace-scoped endpoints.

| Method + path | Purpose | Auth |
| --- | --- | --- |
| `GET /v1/workspaces/:workspaceId/user-groups` | List (includes archived with a query flag) | Any workspace member |
| `GET /v1/workspaces/:workspaceId/user-groups/:id` | Full detail incl. member DTOs | Any workspace member |
| `POST /v1/workspaces/:workspaceId/user-groups` | Create: `{ handle, name, description?, tone?, memberIds[] }` | `OWNERS_ONLY` |
| `PATCH /v1/workspaces/:workspaceId/user-groups/:id` | Rename, re-handle, edit description / tone | `OWNERS_ONLY` |
| `POST /v1/workspaces/:workspaceId/user-groups/:id/members` | `{ memberIds[] }` — idempotent add | `OWNERS_ONLY` |
| `DELETE /v1/workspaces/:workspaceId/user-groups/:id/members/:memberId` | Idempotent remove | `OWNERS_ONLY` |
| `DELETE /v1/workspaces/:workspaceId/user-groups/:id` | Soft-archive (sets `archivedAt`) | `OWNERS_ONLY` |

Shared DTO in `packages/shared/src/dto.ts`:

```ts
export type UserGroupDTO = {
  id: UserGroupId;
  workspaceId: WorkspaceId;
  handle: string;
  name: string;
  description: string | null;
  tone: number;
  memberIds: WorkspaceMemberId[];
  memberCount: number;
  createdAt: string;
  archivedAt: string | null;
};
```

Handle validation errors map to a structured problem response:

- `USER_GROUP_HANDLE_TAKEN` — another group or user has this handle.
- `USER_GROUP_HANDLE_RESERVED` — `everyone`, `here`.
- `USER_GROUP_HANDLE_INVALID` — failed regex.

---

## 7. Realtime

New event kinds on the existing `realtime-event-publisher`:

- `user_group.created` → full `UserGroupDTO`.
- `user_group.updated` → full `UserGroupDTO` (any field change: name, handle, description, members, archivedAt).
- `user_group.archived` → `{ id, archivedAt }`.

Clients maintain a `Map<UserGroupId, UserGroupDTO>` per workspace. Both the composer suggestion list and `remarkMentions` (via workspace context) read from the same map, so a rename is immediately reflected everywhere — in-flight drafts included.

---

## 8. Anti-abuse / guardrails

| Concern | Mitigation |
| --- | --- |
| `@everyone` misfire in a big room | Confirm dialog at > 25 recipients; rate limit: max 3 `@everyone` / `@here` per actor per room per hour (soft — return a warning, let them proceed). |
| Group membership churn mid-send | Resolution always happens inside the UoW that saves the `Message`, under the same transaction. A mid-send `UserGroup.updatedAt` change either lands before or after — never in between — for the same message. |
| Archived members | Group expansion filters members whose `WorkspaceMember` is still present (cascade-delete already covers removed members). |
| Handle collision via rename (a user renames themselves into `@foundation`) | Group wins at resolve-time; no data loss, user's handle just becomes inaccessible until either side changes. Admin UI surfaces the conflict. |
| Recursive groups | Not supported; groups contain `WorkspaceMember`s only. |
| DM abuse | `@everyone` / `@here` in DMs are noops (no expansion, no notifications). |

---

## 9. Phased rollout

| Phase | Scope | Success signal |
| --- | --- | --- |
| **P0** | Spec sign-off, chip design pass, copy deck for `via` / caption / confirm | Shared vocabulary |
| **P1** | Prisma migration: `UserGroup`, `UserGroupMember`, `MentionBuiltin`, `NotificationMentionGroup` delta, `Notification` delta. Shared DTOs + IDs + `packages/shared/src/mentions.ts`. | `prisma generate` clean; DB has the tables. |
| **P2** | CRUD API + realtime events. Lightweight admin UI (workspace settings: list groups, create, edit members). | Owner can create `@foundation` and see it realtime in another tab. |
| **P3** | Composer integration: unified suggestion list, group + builtin chips, draft caption. `remarkMentions` + `MentionChip` variants. | Typing `@fo…` suggests the group; sent message renders group chip. |
| **P4** | Server-side resolution: builtin + group expansion in `send-message.service.ts`, `MessageSent` carries `MentionResolution`. `NotificationProjector` writes `viaUserGroupIds` / `viaBuiltin` / `directMention`. | Members of `@foundation` get their bucket bumped; inbox shows `via @foundation`. |
| **P5** | Confirm dialog threshold, per-user/per-room/per-workspace settings (§4.8). | No accidental 50-person `@everyone` fires; admins can lock down noisy rooms. |

Each phase lands independently behind the feature not being discoverable (no composer entry point) until P3 ships. P1 + P2 can land while P3/P4 are still in review.

---

## 10. Open decisions (need product call)

1. **Group descriptions in the mention chip tooltip** — show or hide? **Lean:** show when `description` is set; gives authors context before sending.
2. **`@here` threshold** — does it respect the 25-person cap, or is "11 people online right now" always fine? **Lean:** same cap. Predictability beats clever exceptions.
3. **Group-member indicator in sidebar** — if you're in `@foundation`, does the group appear as a pill in your profile surface somewhere? **Lean:** v2. Ship without first, see if anyone asks.
4. **Archive vs hard-delete** — ever allow hard-delete? **Lean:** never. Archived groups keep historical chips honest.
5. **Builtins in threads** — confirmed in scope; worth a final sanity read once P4 lands.

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Group pings feel noisier than direct pings → people mute the group | Ship `directMention`-based "mute indirect" preference early (v2). The column being present in v1 makes this cheap. |
| Renames cause inbox rows with stale handles | Inbox `via` copy reads from current `UserGroup.handle` via the workspace map; bucket stores `userGroupId`, not the handle string. |
| Realtime lag on group edits leaves composer suggesting stale member counts | Counts are advisory; server-side resolution is the source of truth. Worst case: caption says "3 people" but 4 get notified — acceptable. |
| Resolver performance with many groups | List is workspace-scoped and bounded (dozens, not thousands). Pull the full group map once at send; in-memory Set lookups. |

---

## 12. Summary one-liner

**Default:** Add `UserGroup`s (workspace-scoped, handle-addressable, owner-managed) plus reserved `@everyone` / `@here` builtins. Server resolves at send-time into the existing mention pipeline; notification buckets gain `viaUserGroupIds` / `viaBuiltin` / `directMention` so inbox rows can show a muted `via @foundation` trail without overriding direct pings. Composer gets a live fan-out caption; large fan-outs hit a confirm dialog. Ship in five phases behind a composer entry point that only appears at P3.
