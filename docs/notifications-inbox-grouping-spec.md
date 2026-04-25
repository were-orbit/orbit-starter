# Spec: Inbox notification grouping (“quieter mentions”)

**Status:** Draft — **Option 3 (persisted buckets) implemented for non-DM @mentions** (dev; run `prisma migrate` + clear DB as needed).  
**Owner:** Product + web + API  
**Related:** `NotificationProjector`, `NotificationMentionGroup` Prisma model, `InboxPage`, `useThreadActivity`, read cursors / unread counts

---

## 1. Problem

Today, **each `@mention` mints one `Notification` row** (`MENTION`, `messageId`, `roomId`). If someone @mentions you **many times in one thread** (or room) in a short period, you get **many parallel inbox rows** for what feels like one “conversation got loud” moment.

**Unread message count** in a room is already separate (read cursors). The gap is **inbox mental load** for high-frequency mentions in the **same context**.

**Brand fit:** Orbit skews “quieter internet” — the inbox should feel **curated**, not like a firehose of duplicate signal.

---

## 2. Goals


| Goal                                                                                                                                                          | Notes                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **G1** Reduce duplicate-feeling inbox rows for **same room/thread + same actor + short time window**.                                                         | Without hiding “someone new pinged you from another room.”      |
| **G2** Preserve a clear **primary action**: open the right place, ideally scrolled to something useful (latest mention or first unread).                      | Match muscle memory from Slack / Discord / Linear-ish surfaces. |
| **G3** **Mark read** stays predictable: dismissing a group should clear **all** underlying mentions in that group (or offer expand-to-mark-individual later). | v1 can be all-or-nothing per group.                             |
| **G4** Don’t conflate **plain unread** with **inbox notifications** — no change to “100 messages, zero @” behavior.                                           | Already correct server-side.                                    |
| **G5** Sidebar `**@N` / thread activity** should stay **honest** after grouping (either same count semantics or an explicit “N mentions” label).              | Avoid silent drift between inbox and rail.                      |


**Non-goals (v1):** digest emails; push notifications; cross-workspace rollup; rewriting `THREAD_INVITED` / `ROOM_*` kinds (can stay one row each unless we decide otherwise).

---

## 3. Current behavior (baseline)

- `**MENTION`:** one row per `MessageSent` × recipient in `NotificationProjector`.
- `**THREAD_INVITED`:** one row per invited member on `ThreadCreated` (already “one per thread join”).
- **Inbox UI:** lists unread notifications; keyboard + “mark all” operate per row / all.
- `**useThreadActivity`:** counts **unread** `MENTION` + `THREAD_INVITED` by `roomId` for sorting / `@` badge — **aggregation only**, not merged DB rows.

---

## 4. Proposed product behavior

### 4.1 Grouping rule (default)

**Group key (v1 proposal):**  
`(recipientWorkspaceMemberId, roomId, actorWorkspaceMemberId, bucketId)`

Where `**bucketId`** is derived from **calendar day in the recipient’s timezone** *or* a **fixed sliding window** (e.g. start of hour). Pick one:


| Option                                              | Pros                                                   | Cons                                                                           |
| --------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **A. Calendar day (recipient TZ)**                  | Simple mental model (“today’s pings from Alex in #x”). | Boundary at midnight can split one binge session.                              |
| **B. Sliding 4h window from first unread in group** | Better for “one long night thread.”                    | Harder to explain; needs stable “window anchor” in DB or derived at read time. |


**Recommendation:** Start with **A (calendar day)** for implementation simplicity and clear copy (“Today in *thread*”). Revisit **B** if dogfooding says midnight splits are annoying.

**Kinds in scope for grouping:** at minimum `**MENTION`**. Optionally add `**THREAD_INVITED**` into the same bucket only when same actor+room+day (usually 1 anyway).

**Kinds out of scope (v1):** `THREAD_CLOSED`, `ROOM_ARCHIVED`, `ROOM_INVITED`, `INVITE_ACCEPTED` — keep **one row each** (low volume, different semantics).

### 4.2 Inbox row presentation

Each **group** renders as **one row**:

- **Title line:** Actor + verb + room/thread name (reuse current `InboxRow` patterns).
- **Secondary line:** e.g. “**5 mentions** · latest 12m ago” (or “5× @you”).
- **Optional chevron** (v2): expand to see individual message snippets / jump links.

**Primary click:** navigate to `room` with search `msg=<latestMessageIdInGroup>` (or “deepest unread” policy — see §6).

### 4.3 Mark read

- **Row dismiss / “E” / mark-read on group:** mark `**readAt` on all `Notification` rows** in that group (same as today’s per-id API, batched).
- **Mark all read:** unchanged semantically — all unread notifications for the workspace member.

### 4.4 Settings (v2 or v1 if cheap)

Workspace or user preference:


| Setting                   | Values                                 |
| ------------------------- | -------------------------------------- |
| **Mention inbox density** | `each` (current) / `grouped` (default) |


Stored in user prefs JSON or a small column when you have a profile table. **Default = `grouped`** to match brand.

---

## 5. Implementation strategies

### Option 1 — **Presentation-only grouping (web)**

- **API:** unchanged; list endpoint still returns N rows.
- **Web:** `useMemo` groups unread `MENTION` by key from §4.1; inbox renders groups; mark-read calls `**POST …/read` in a loop or a new batch endpoint** for all ids in the group.

**Pros:** Fast to ship; no migration.  
**Cons:** Pagination weird if you page raw rows; N network calls for dismiss unless you add **batch mark-read API**.

### Option 2 — **Server “view model” (API returns groups)**

- **New endpoint or query flag:** `GET /v1/notifications?grouped=1` returns **group DTOs** `{ ids[], roomId, actorId, kind, latestAt, count, latestMessageId, … }`.
- **Mark read:** `POST /v1/notifications/read-bulk` with `{ ids: [...] }` or `POST …/read-group` with group key.

**Pros:** Correct pagination; one round-trip for dismiss; single source of truth for counts.  
**Cons:** More API + client work; must version DTOs.

### Option 3 — **Persisted bucket entity (heavy)** — **implemented**

- Table `notification_mention_groups` (`NotificationMentionGroup` in Prisma): one row per `(recipient, room, actor, UTC YYYY-MM-DD)` for **non-DM** rooms/threads; bumps `mentionCount` + `latestMessageId`. **DMs** still use one `Notification` row per @mention.
- List API merges `Notification` + groups into `NotificationDTO[]` (groups use `ntgrp_*` ids, `kind: MENTION`, optional `mentionCount` / `bucketDate`).
- Mark-read / mark-all and realtime follow the same wire types (`notification.created` upserts for group bumps).

**Recommendation (remaining):** optional user setting `each` vs `grouped`; expand-row UI; non-UTC bucket TZ.

---

## 6. Open decisions (need product call)

1. **Click target:** open at **latest mention in group** vs **first unread in thread** (may differ if messages arrived out of order). **Default:** latest mention (simplest, matches “what just happened”).
2. **Same actor vs any actor:** should “Alex 3× + Blake 2× in same thread same day” be **one** group or **two**? **Default:** **per actor** (key includes `actorWorkspaceMemberId`) — clearer accountability.
3. **DMs:** same grouping as threads, or **never group** in DMs (each ping feels personal)? **Lean:** never group in **DM rooms** (`isDm`), group in **threads + public rooms**.
4. `**THREAD_INVITED` + `MENTION` same day same room:** one combined row or separate sections? **Lean:** separate rows by kind for v1; only group **within kind**.

---

## 7. Phased rollout


| Phase  | Scope                                  | Success signal                           |
| ------ | -------------------------------------- | ---------------------------------------- |
| **P0** | Spec sign-off + copy deck              | Shared vocabulary                        |
| **P1** | Web-only grouping + bulk mark-read API | Inbox row count drops in dogfood threads |
| **P2** | Grouped API / pagination               | No client-side “load 500 rows to group”  |
| **P3** | User setting `each` vs `grouped`       | Power users satisfied                    |
| **P4** | Expand row → child mentions            | Forensics without leaving inbox          |


---

## 8. Risks & mitigations


| Risk                                             | Mitigation                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| User thinks they “lost” mentions                 | Copy (“5 mentions”); optional expand in P4                                                                                     |
| Race: new mention arrives while dismissing group | Transactional bulk read; or optimistic UI with id list version                                                                 |
| Sidebar count ≠ inbox row count                  | Document: badge = **unread mention-notifications**; inbox = **groups** — may show “3 rows, 12 mentions” in subtitle or tooltip |


---

## 9. Checklist before implementation

- Decide bucket: **day** vs **sliding window** (§4.1).
- Decide **DM** behavior (§6.3).
- Choose **Option 1 vs 2** (§5) based on whether bulk read API exists.
- Align **sidebar badge** copy or computation with grouped inbox (§2 G5).
- QA: thread with 50 @s, mark group read, realtime insert of new @ same bucket.

---

## 10. Summary one-liner

**Default:** Group unread `**MENTION`** inbox rows by **(room, actor, calendar day)** for non-DM rooms; **one dismiss** marks all underlying IDs read; **navigate to latest** mention in the group. Keep **non-mention** unread as today (cursors only). Add **bulk mark-read** if the client would otherwise spam `POST /read`.