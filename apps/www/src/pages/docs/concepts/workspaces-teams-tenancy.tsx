import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
  DocsTable,
} from "@/components/docs-layout";

export const meta = {
  title: "Workspaces, teams & tenancy",
  description:
    "How Orbit scopes every row, every permission, and every realtime channel.",
};

export function WorkspacesTeamsTenancyPage() {
  return (
    <DocsLayout
      kicker="02 · Concepts"
      title={meta.title}
      description={meta.description}
      path="/docs/concepts/workspaces-teams-tenancy"
    >
      <DocsP>
        A <strong>workspace</strong> is Orbit's tenancy root. Every domain row
        that isn't a user sits inside exactly one workspace, and every API
        route resolves a workspace early — via <DocsCode>/v1/workspaces/:slug</DocsCode>{" "}
        — so the rest of the request can assume its scope without re-proving
        it. Teams, when the feature is on, nest <em>inside</em> a workspace:
        they're a narrower permission scope, never a tenant of their own.
      </DocsP>

      <DocsH2>The three aggregates</DocsH2>
      <DocsTable
        columns={["Aggregate", "Key", "What it is"]}
        rows={[
          [
            <DocsCode>Workspace</DocsCode>,
            <DocsCode>id</DocsCode>,
            <>
              The tenant root. Has a globally unique{" "}
              <DocsCode>slug</DocsCode> (shows up in URLs), a name, and an{" "}
              <DocsCode>ownerId</DocsCode>. Holds no application data itself —
              it's the anchor others hang off.
            </>,
          ],
          [
            <DocsCode>WorkspaceMember</DocsCode>,
            <DocsCode>(workspaceId, userId)</DocsCode>,
            <>
              One row per user × workspace pair. Holds an inlined{" "}
              <DocsCode>WorkspaceMemberRoleSnapshot</DocsCode> so authorization
              is an O(1) set lookup with no extra repository hop.
            </>,
          ],
          [
            <DocsCode>WorkspaceInvite</DocsCode>,
            <DocsCode>token</DocsCode>,
            <>
              A pending invitation. Points at an email and optionally a role
              id. Becomes a <DocsCode>WorkspaceMember</DocsCode> when accepted.
            </>,
          ],
        ]}
      />

      <DocsH2>The shape of a member</DocsH2>
      <DocsP>
        <DocsCode>WorkspaceMember</DocsCode> is the aggregate you'll touch most
        often — it carries the role snapshot, which is what the permission
        guards read:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/workspaces/domain/workspace-member.ts">
        {`export interface WorkspaceMemberRoleSnapshot {
  id: WorkspaceRoleId;
  systemKey: WorkspaceRoleSystemKey | null; // OWNER | ADMIN | MEMBER | null
  permissions: readonly WorkspacePermission[];
}

export class WorkspaceMember {
  static join(input: { workspaceId, userId, role, seed }, clock): WorkspaceMember;
  changeRole(next: WorkspaceMemberRoleSnapshot, changedByMemberId): void;
  hasPermission(p: WorkspacePermission): boolean;
  leave(): void;
}`}
      </DocsCodeBlock>
      <DocsP>
        Each mutation enqueues a domain event onto the aggregate —{" "}
        <DocsCode>WorkspaceMemberJoined</DocsCode>,{" "}
        <DocsCode>WorkspaceMemberRoleChanged</DocsCode>,{" "}
        <DocsCode>WorkspaceMemberLeft</DocsCode> — collected by the Unit of
        Work and dispatched after commit. The realtime publisher listens and
        pushes DTOs to every socket on the workspace channel.
      </DocsP>

      <DocsH2>How teams fit in</DocsH2>
      <DocsP>
        Teams are an <em>optional</em> feature (<DocsCode>--no-teams</DocsCode>{" "}
        strips them at scaffold time). When on, they add a parallel
        aggregate family under <DocsCode>apps/api/src/teams/</DocsCode>:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>Team</DocsCode> — keyed by{" "}
          <DocsCode>id</DocsCode>, belongs to a workspace, has its own slug
          scoped within that workspace.
        </li>
        <li>
          <DocsCode>TeamMember</DocsCode> — keyed by{" "}
          <DocsCode>(teamId, workspaceMemberId)</DocsCode>. A team member must
          already be a workspace member; teams <em>narrow</em> scope, they
          never widen it.
        </li>
        <li>
          <DocsCode>TeamRole</DocsCode> — system roles{" "}
          <DocsCode>TEAM_ADMIN</DocsCode> and <DocsCode>TEAM_MEMBER</DocsCode>,
          plus any custom roles. Permissions are exclusively{" "}
          <DocsCode>team.*</DocsCode> — see the PBAC page.
        </li>
      </DocsList>

      <DocsCallout>
        The nesting only goes one level deep. There are no sub-teams, and
        there's no team-of-teams. The assumption is that "workspace" is your
        billing/admin boundary and "team" is your organizational boundary
        inside it.
      </DocsCallout>

      <DocsH2>URLs and scoping</DocsH2>
      <DocsP>
        Every authenticated route on the API lives under{" "}
        <DocsCode>/v1/workspaces/:slug/...</DocsCode>. The session middleware
        resolves the slug to a workspace and the caller's{" "}
        <DocsCode>WorkspaceMember</DocsCode> once, stashes both on the context,
        and every downstream handler reads them from there — no handler looks
        up a workspace by itself.
      </DocsP>
      <DocsCodeBlock caption="A typical request path">
        {`GET /v1/workspaces/demo/members
  ↓ session middleware
    resolves user from cookie
    resolves workspace "demo"
    resolves WorkspaceMember (user, workspace)
    fails with 404 if the user isn't a member
  ↓ controller
    reads c.get("me") — no extra round-trip`}
      </DocsCodeBlock>

      <DocsP>
        On the web side, the router mirrors this: the authenticated shell's
        root route is <DocsCode>/d/$workspaceSlug</DocsCode>, and everything
        inside is workspace-scoped. The store layer (
        <DocsCode>workspace-stores.ts</DocsCode>) keys every realtime cache by
        workspace, so switching workspaces is a full reset, not a filter.
      </DocsP>

      <DocsH2>Invites and joining</DocsH2>
      <DocsP>
        The invite flow is intentionally one-shot:
      </DocsP>
      <DocsList ordered>
        <li>
          A member with <DocsCode>workspace.members.invite</DocsCode> creates
          a <DocsCode>WorkspaceInvite</DocsCode> row. The service emits a{" "}
          <DocsCode>WorkspaceInvited</DocsCode> event post-commit.
        </li>
        <li>
          A projector listens for that event and asks the Mailer port to send
          an email with a link to{" "}
          <DocsCode>{"${WEB_ORIGIN}/invites/accept?token=..."}</DocsCode>.
        </li>
        <li>
          The recipient clicks, signs in if they haven't already, and{" "}
          <DocsCode>POST /v1/invites/accept</DocsCode> swaps the invite for a{" "}
          <DocsCode>WorkspaceMember</DocsCode> on the embedded role.
        </li>
      </DocsList>
      <DocsCallout>
        Accept is idempotent — replaying a token that's already been consumed
        returns the existing membership instead of 400'ing. Keeps double-clicks
        from breaking the flow.
      </DocsCallout>

      <DocsH3>The owner special-case</DocsH3>
      <DocsP>
        The <DocsCode>ownerId</DocsCode> column on <DocsCode>Workspace</DocsCode>{" "}
        is load-bearing: the OWNER system role is permission-locked to the
        full workspace-permission set, and workspace owners bypass all{" "}
        <DocsCode>team.*</DocsCode> guards outright (see{" "}
        <DocsCode>TeamsController.requireTeamPermission</DocsCode>). You can
        demote an admin; you can't demote the owner without transferring
        ownership first.
      </DocsP>
    </DocsLayout>
  );
}
