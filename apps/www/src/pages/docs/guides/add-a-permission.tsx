import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
} from "@/components/docs-layout";

export const meta = {
  title: "Add a permission & role check",
  description:
    "Extend the permission vocabulary, wire it to a default role, then guard the route and gate the UI.",
};

export function AddAPermissionPage() {
  return (
    <DocsLayout
      kicker="03 · Guides"
      title={meta.title}
      description={meta.description}
      path="/docs/guides/add-a-permission"
    >
      <DocsP>
        Walking example: add <DocsCode>projects.create</DocsCode> — a
        workspace-scoped permission for the Projects context. The same four
        steps work for any permission, workspace- or team-scoped.
      </DocsP>
      <DocsCallout>
        TypeScript does most of the enforcement. Every downstream spot that
        references the permission union will fail to compile until you've
        covered it — a feature, not a bug.
      </DocsCallout>

      <DocsH2>1. Extend the union</DocsH2>
      <DocsP>
        Open <DocsCode>packages/shared/src/permissions.ts</DocsCode> and add
        the new string to the relevant union plus its "all" array:
      </DocsP>
      <DocsCodeBlock caption="packages/shared/src/permissions.ts">
        {`export type WorkspacePermission =
  | "workspace.delete"
  | "workspace.settings.edit"
  | "workspace.roles.manage"
  | "workspace.members.invite"
  | "workspace.members.remove"
  | "workspace.members.change_role"
  | "projects.create"                       // ← new
  | "teams.create"
  | "teams.delete_any"
  // ... etc
;

export const ALL_WORKSPACE_PERMISSIONS: readonly WorkspacePermission[] = [
  "workspace.delete",
  "workspace.settings.edit",
  "workspace.roles.manage",
  "workspace.members.invite",
  "workspace.members.remove",
  "workspace.members.change_role",
  "projects.create",                        // ← new
  "teams.create",
  // ...
];`}
      </DocsCodeBlock>
      <DocsP>
        Use <DocsCode>TeamPermission</DocsCode> +{" "}
        <DocsCode>ALL_TEAM_PERMISSIONS</DocsCode> for team-scoped permissions
        (names starting with <DocsCode>team.</DocsCode>).
      </DocsP>

      <DocsH2>2. Add a descriptor</DocsH2>
      <DocsP>
        <DocsCode>PERMISSION_GROUPS</DocsCode> is what the role editor reads
        to render the checkbox list. Add an item to an existing group or
        create a new group:
      </DocsP>
      <DocsCodeBlock>
        {`export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  // ...existing groups...
  {
    group: "Projects",
    scope: "workspace",
    items: [
      {
        permission: "projects.create",
        label: "Create projects",
        description: "Open new projects inside the workspace.",
      },
    ],
  },
];`}
      </DocsCodeBlock>
      <DocsCallout>
        The role editor asserts at compile time that every{" "}
        <DocsCode>Permission</DocsCode> appears in exactly one descriptor
        group — a permission without a description is a bug.
      </DocsCallout>

      <DocsH2>3. Update the default role sets</DocsH2>
      <DocsP>
        Decide who gets it out of the box. The three default arrays are in
        the same file:
      </DocsP>
      <DocsCodeBlock>
        {`// Owners always have everything; nothing to add.
export const DEFAULT_OWNER_PERMISSIONS = ALL_WORKSPACE_PERMISSIONS;

// Admins get it:
export const DEFAULT_ADMIN_PERMISSIONS: readonly WorkspacePermission[] = [
  "workspace.settings.edit",
  "workspace.members.invite",
  "workspace.members.remove",
  "workspace.members.change_role",
  "projects.create",        // ← add
  // ...
];

// Members get it too — it's creation of their own projects:
export const DEFAULT_MEMBER_PERMISSIONS: readonly WorkspacePermission[] = [
  "projects.create",        // ← add
  "teams.create",
];`}
      </DocsCodeBlock>
      <DocsP>
        The seed script uses these when creating workspace roles. Existing
        rows in prod aren't touched — only newly-seeded workspaces pick up
        the new default. For existing workspaces, the permission is{" "}
        <em>available</em> for manual assignment via the role editor.
      </DocsP>
      <DocsCallout kind="warn">
        If you want the permission backfilled onto existing roles, write a
        one-shot migration that inserts{" "}
        <DocsCode>WorkspaceRolePermission</DocsCode> rows for every role
        matching a <DocsCode>systemKey</DocsCode>. Don't rerun the seed — it's
        idempotent and won't touch existing roles.
      </DocsCallout>

      <DocsH2>4. Guard the route</DocsH2>
      <DocsP>
        In the controller for the new capability, call{" "}
        <DocsCode>requirePermission</DocsCode> on the resolved member:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/interfaces/http/controllers/projects.controller.ts">
        {`.post("/", async (c) => {
  const { userId } = requireSession(c);
  const { me, workspace } = await resolveWorkspaceMember(c, userId);
  requirePermission(me, "projects.create");     // ← here

  const body = CreateBody.parse(await c.req.json());
  // ...
})`}
      </DocsCodeBlock>
      <DocsP>
        Failure throws <DocsCode>ForbiddenError("permission.denied")</DocsCode>{" "}
        → 403 with a stable error code.
      </DocsP>

      <DocsH3>Team-scoped permissions</DocsH3>
      <DocsP>
        For <DocsCode>team.*</DocsCode> permissions, use{" "}
        <DocsCode>requireTeamPermission</DocsCode> instead. Same shape, but
        it also requires the team id:
      </DocsP>
      <DocsCodeBlock>
        {`const teamId = zPrefixedId("team").parse(c.req.param("teamId"));
await requireTeamPermission(c, me, workspace, teamId, "team.settings.edit");`}
      </DocsCodeBlock>

      <DocsH2>5. Gate the UI</DocsH2>
      <DocsP>
        On the web side, use <DocsCode>useCan</DocsCode> for workspace
        permissions or <DocsCode>useCanTeam</DocsCode> for team ones:
      </DocsP>
      <DocsCodeBlock>
        {`import { useCan } from "~/lib/pbac/use-can";

export function CreateProjectButton() {
  const canCreate = useCan("projects.create");
  return (
    <Button disabled={!canCreate} onClick={openDialog}>
      New project
    </Button>
  );
}`}
      </DocsCodeBlock>
      <DocsCallout kind="warn">
        Client-side gating is UX polish, never a security boundary. The API
        enforces the same permission on every request; the hook just saves a
        round-trip to a 403.
      </DocsCallout>

      <DocsH2>6. Run typecheck</DocsH2>
      <DocsCodeBlock>
        {`npm run typecheck`}
      </DocsCodeBlock>
      <DocsP>
        Three spots will complain if you missed one:
      </DocsP>
      <DocsList>
        <li>
          <DocsCode>ALL_WORKSPACE_PERMISSIONS</DocsCode> has the wrong length.
        </li>
        <li>
          A <DocsCode>PERMISSION_GROUPS</DocsCode> entry is missing a
          descriptor.
        </li>
        <li>
          <DocsCode>defaultPermissionsFor(key)</DocsCode> returns arrays that
          don't cover the new permission where it should.
        </li>
      </DocsList>
      <DocsP>
        Fix the complaints, run{" "}
        <DocsCode>npm run test --workspace @orbit/api</DocsCode> to make
        sure the permission guards still behave, and you're done.
      </DocsP>
    </DocsLayout>
  );
}
