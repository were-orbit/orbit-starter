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
  title: "Two-scope PBAC",
  description:
    "One permission vocabulary, two scopes: workspace-wide vs. team-specific. The same shape on both sides.",
};

export function TwoScopePbacPage() {
  return (
    <DocsLayout
      kicker="02 · Concepts"
      title={meta.title}
      description={meta.description}
      path="/docs/concepts/two-scope-pbac"
    >
      <DocsP>
        Orbit uses <strong>permission-based access control</strong> rather
        than role-based. Permissions are the primitive — roles are named
        bundles of them. A member "can do X" because their role grants X, not
        because of the role's name. The default roles are there for
        ergonomics; custom roles can hold any subset of permissions you want.
      </DocsP>

      <DocsH2>Two scopes, one vocabulary</DocsH2>
      <DocsP>
        Every permission is a string literal declared once in{" "}
        <DocsCode>packages/shared/src/permissions.ts</DocsCode>. Both the API
        guards and the web{" "}
        <DocsCode>useCan()</DocsCode> hook read from the same list, so adding
        a permission lights up in both places at once.
      </DocsP>

      <DocsH3>Workspace-scoped</DocsH3>
      <DocsP>
        Checked against the member's <DocsCode>WorkspaceRole</DocsCode>.
        Granted to the member for the <em>whole</em> workspace, regardless of
        which teams they're on.
      </DocsP>
      <DocsCodeBlock>
        {`type WorkspacePermission =
  | "workspace.delete"
  | "workspace.settings.edit"
  | "workspace.roles.manage"
  | "workspace.members.invite"
  | "workspace.members.remove"
  | "workspace.members.change_role"
  | "teams.create"
  | "teams.delete_any"
  | "billing.view"
  | "billing.manage";`}
      </DocsCodeBlock>

      <DocsH3>Team-scoped</DocsH3>
      <DocsP>
        Checked against the member's <DocsCode>TeamRole</DocsCode> on a{" "}
        <em>specific</em> team. Only meaningful in the shape "this member, on
        this team."
      </DocsP>
      <DocsCodeBlock>
        {`type TeamPermission =
  | "team.settings.edit"
  | "team.delete"
  | "team.roles.manage"
  | "team.members.invite"
  | "team.members.remove"
  | "team.members.change_role";`}
      </DocsCodeBlock>

      <DocsCallout>
        The two scopes share a union (<DocsCode>type Permission</DocsCode>)
        because a string is either a workspace permission or a team permission,
        never both. The <DocsCode>scopeOf(permission)</DocsCode> helper resolves
        which.
      </DocsCallout>

      <DocsH2>System roles</DocsH2>
      <DocsTable
        columns={["Scope", "Role", "Default permissions"]}
        rows={[
          [
            "Workspace",
            <DocsCode>OWNER</DocsCode>,
            "All workspace permissions. Locked — cannot be renamed or have permissions edited.",
          ],
          [
            "Workspace",
            <DocsCode>ADMIN</DocsCode>,
            <>
              Member/role management, billing.view, teams.create,
              teams.delete_any. Editable.
            </>,
          ],
          [
            "Workspace",
            <DocsCode>MEMBER</DocsCode>,
            <>
              <DocsCode>teams.create</DocsCode> only (when teams are on) —
              mostly view-only. Editable.
            </>,
          ],
          [
            "Team",
            <DocsCode>TEAM_ADMIN</DocsCode>,
            "All team permissions.",
          ],
          [
            "Team",
            <DocsCode>TEAM_MEMBER</DocsCode>,
            "No team permissions by default. Visibility only.",
          ],
        ]}
      />
      <DocsP>
        Custom roles sit alongside system roles in the same tables — both use{" "}
        <DocsCode>WorkspaceRole</DocsCode> / <DocsCode>TeamRole</DocsCode>. The
        <DocsCode>isSystem</DocsCode> and <DocsCode>systemKey</DocsCode>{" "}
        columns mark the reserved ones.
      </DocsP>

      <DocsH2>Enforcing it on the API</DocsH2>
      <DocsP>
        Permission is checked once per request, in the controller, on a
        fully-hydrated <DocsCode>WorkspaceMember</DocsCode>. Services treat
        permission as a pre-established invariant and don't re-check.
      </DocsP>

      <DocsH3>Workspace permissions</DocsH3>
      <DocsCodeBlock caption="apps/api/src/interfaces/http/middleware/session.ts">
        {`export function requirePermission(
  me: WorkspaceMember,
  permission: WorkspacePermission,
): void {
  if (!me.hasPermission(permission)) {
    throw new ForbiddenError("permission.denied");
  }
}`}
      </DocsCodeBlock>
      <DocsP>
        <DocsCode>me.hasPermission()</DocsCode> is an O(1) set lookup against
        the <DocsCode>WorkspaceMemberRoleSnapshot</DocsCode> inlined on the
        aggregate — no extra repository hop per guard.
      </DocsP>

      <DocsH3>Team permissions</DocsH3>
      <DocsP>
        Team checks take an extra step: fetch the{" "}
        <DocsCode>TeamMember</DocsCode> row for{" "}
        <DocsCode>(team, workspaceMember)</DocsCode>, then check its role.
        Two useful shortcuts apply before that lookup:
      </DocsP>
      <DocsList>
        <li>
          Workspace owners bypass every <DocsCode>team.*</DocsCode> check
          outright.
        </li>
        <li>
          Members with <DocsCode>teams.delete_any</DocsCode> bypass the team
          lookup for <DocsCode>team.delete</DocsCode> specifically — useful
          for workspace admins policing cleanup.
        </li>
      </DocsList>
      <DocsP>
        Everyone else gets a <DocsCode>403 team.not_a_member</DocsCode> if
        they're not on the team, or <DocsCode>403 permission.denied</DocsCode>{" "}
        if they are but lack the specific team permission.
      </DocsP>

      <DocsH3>A full controller</DocsH3>
      <DocsCodeBlock>
        {`app.delete("/:teamId", session(), async (c) => {
  const { userId } = requireSession(c);
  const { me, workspace } = await resolveWorkspaceMember(c, userId);

  const teamId = zPrefixedId("team").parse(c.req.param("teamId"));
  await requireTeamPermission(c, teamId, me, "team.delete");

  await deleteTeamService.execute({ workspaceId: workspace.id, teamId, actorId: me.id });
  return c.body(null, 204);
});`}
      </DocsCodeBlock>

      <DocsH2>Client-side gating</DocsH2>
      <DocsP>
        On the web, the same permission strings drive UI affordances. The
        session fetch returns the caller's{" "}
        <DocsCode>WorkspaceMemberRoleSnapshot</DocsCode>; the client caches it
        and exposes two hooks:
      </DocsP>
      <DocsCodeBlock>
        {`// Workspace-scoped
const canInvite = useCan("workspace.members.invite");

// Team-scoped — needs a team id
const canEditSettings = useCanTeam(teamId, "team.settings.edit");

return (
  <Button disabled={!canInvite} onClick={openInviteDialog}>
    Invite member
  </Button>
);`}
      </DocsCodeBlock>
      <DocsCallout kind="warn">
        Client-side gating is a UX convenience, never a security boundary. The
        API enforces the same permission on every request; disabled buttons
        just save a round-trip to a <DocsCode>403</DocsCode>.
      </DocsCallout>

      <DocsH2>Changing roles and permissions</DocsH2>
      <DocsP>
        Roles are just rows. The role editor in the settings UI drives three
        services:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>CreateRoleService</DocsCode> — new custom role with any
          subset of <DocsCode>ALL_WORKSPACE_PERMISSIONS</DocsCode>.
        </li>
        <li>
          <DocsCode>UpdateRoleService</DocsCode> — rename a role, rewrite its
          permission set. Emits{" "}
          <DocsCode>WorkspaceRoleUpdated</DocsCode>.
        </li>
        <li>
          <DocsCode>DeleteRoleService</DocsCode> — only for custom roles.
          Members holding it fall back to the workspace{" "}
          <DocsCode>MEMBER</DocsCode> role.
        </li>
      </DocsList>
      <DocsP>
        Each emits a domain event, the realtime publisher picks it up
        post-commit, and every other open tab updates immediately — so a
        permission toggle is instantly reflected in UI for every session on
        the workspace.
      </DocsP>

      <DocsH2>Adding a permission</DocsH2>
      <DocsP>
        Adding one is a three-line change followed by a wire-up:
      </DocsP>
      <DocsList ordered>
        <li>
          Add the string to the <DocsCode>WorkspacePermission</DocsCode> or{" "}
          <DocsCode>TeamPermission</DocsCode> union in{" "}
          <DocsCode>packages/shared/src/permissions.ts</DocsCode>.
        </li>
        <li>
          Add it to <DocsCode>ALL_WORKSPACE_PERMISSIONS</DocsCode> (or{" "}
          <DocsCode>ALL_TEAM_PERMISSIONS</DocsCode>) and, optionally, the
          default set for the role that should grant it by default.
        </li>
        <li>
          Add a <DocsCode>PermissionDescriptor</DocsCode> so the role editor
          knows how to label it.
        </li>
        <li>
          Guard the new route with <DocsCode>requirePermission(me, "...")</DocsCode>,
          gate the UI with <DocsCode>useCan("...")</DocsCode>.
        </li>
      </DocsList>
      <DocsCallout>
        TypeScript will do most of the work — the union type makes it
        impossible to forget a spot. If the descriptor map doesn't cover every
        permission, the role-editor compile-time check catches it.
      </DocsCallout>
    </DocsLayout>
  );
}
