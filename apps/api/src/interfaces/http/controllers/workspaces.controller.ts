import { Hono, type Context } from "hono";
import { ForbiddenError, NotFoundError } from "@/kernel/errors.ts";
import {
  workspaceInviteToDTO,
  workspaceMemberToDTO,
  workspaceRoleToDTO,
  workspaceToDTO,
} from "@/interfaces/mappers.ts";
import type { WorkspaceRole, WorkspaceRoleId } from "@/workspaces/domain/workspace-role.ts";
import type { HonoEnv } from "../middleware/container.ts";
import { requirePermission, requireSession } from "../middleware/session.ts";
import {
  changeMemberRoleSchema,
  createRoleSchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  updateRoleSchema,
} from "../schemas.ts";
import { zPrefixedId } from "@/kernel/id.ts";

export const workspaces = new Hono<HonoEnv>();

/**
 * Resolves the `:slug` URL parameter to a `{ workspace, me }` pair and
 * pins the result onto the request's wide event. Throws 404 when the
 * slug is unknown and 403 when the caller isn't a member — both
 * outcomes are fine to surface verbatim to authenticated users.
 */
export async function resolveSlug(c: Context<HonoEnv>) {
  const slug = c.req.param("slug");
  const session = requireSession(c);
  const container = c.get("container");
  return container.uow.read(async (tx) => {
    const ws = slug ? await tx.workspaces.findBySlug(slug) : null;
    if (!ws) throw new NotFoundError("workspace");
    const me = await tx.workspaceMembers.findByWorkspaceAndUser(
      ws.id,
      session.userId as ReturnType<typeof String> as never,
    );
    if (!me) throw new ForbiddenError();
    c.get("log")?.set({
      workspace: { id: ws.id, slug: ws.slug, name: ws.name },
      member: { id: me.id, isOwner: me.isOwner },
    });
    return { workspace: ws, me };
  });
}

workspaces.post("/", async (c) => {
  const body = createWorkspaceSchema.parse(await c.req.json());
  const session = requireSession(c);
  const container = c.get("container");
  const log = c.get("log");
  log?.set({
    action: "workspace.create",
    input: {
      slug: body.slug,
      nameLength: body.name.length,
      inviteCount: body.invites?.length ?? 0,
    },
  });
  const result = await container.services.createWorkspace.execute({
    ownerUserId: session.userId as never,
    name: body.name,
    slug: body.slug,
    invites: body.invites,
  });
  log?.set({
    workspace: { id: result.workspace.id, slug: result.workspace.slug },
    result: { invitesSent: result.invites.length },
  });
  const { ownerUser, youRole } = await container.uow.read(async (tx) => ({
    ownerUser: await tx.users.findById(session.userId as never),
    youRole: await tx.workspaceRoles.findById(result.you.roleId),
  }));
  return c.json(
    {
      workspace: workspaceToDTO(result.workspace),
      you:
        ownerUser && youRole
          ? workspaceMemberToDTO(
              result.you,
              { email: ownerUser.email.value, name: ownerUser.name },
              youRole,
            )
          : null,
      invites: result.invites.map((i) => workspaceInviteToDTO(i, null)),
    },
    201,
  );
});

workspaces.get("/:slug", async (c) => {
  const { workspace, me } = await resolveSlug(c);
  const container = c.get("container");
  return container.uow.read(async (tx) => {
    const user = await tx.users.findById(me.userId);
    const rawMembers = await tx.workspaceMembers.listForWorkspace(workspace.id);
    const roleIds = [
      ...new Set<string>([me.roleId, ...rawMembers.map((m) => m.roleId)]),
    ];
    const roleMap = new Map<string, WorkspaceRole>();
    for (const r of await tx.workspaceRoles.findManyByIds(
      roleIds as WorkspaceRoleId[],
    )) {
      roleMap.set(r.id, r);
    }
    const memberDTOs = [] as ReturnType<typeof workspaceMemberToDTO>[];
    for (const m of rawMembers) {
      const u = await tx.users.findById(m.userId);
      const role = roleMap.get(m.roleId);
      if (u && role) {
        memberDTOs.push(
          workspaceMemberToDTO(m, { email: u.email.value, name: u.name }, role),
        );
      }
    }
    const myRole = roleMap.get(me.roleId);
    return c.json({
      workspace: workspaceToDTO(workspace),
      you:
        user && myRole
          ? workspaceMemberToDTO(me, { email: user.email.value, name: user.name }, myRole)
          : null,
      members: memberDTOs,
    });
  });
});

workspaces.delete("/:slug", async (c) => {
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.delete");
  const container = c.get("container");
  await container.services.deleteWorkspace.execute({
    workspaceId: workspace.id,
    deletedByMemberId: me.id,
  });
  return c.body(null, 204);
});

workspaces.get("/:slug/members", async (c) => {
  const { workspace } = await resolveSlug(c);
  const container = c.get("container");
  const rawQ = c.req.query("q");
  const q =
    typeof rawQ === "string" && rawQ.trim().length > 0 ? rawQ.trim().slice(0, 160) : undefined;
  const list = await container.services.listMembers.execute(workspace.id, { query: q });
  return c.json(
    list.map((row) =>
      workspaceMemberToDTO(
        row.member,
        { email: row.user.email, name: row.user.name },
        row.role,
      ),
    ),
  );
});

workspaces.delete("/:slug/members/:memberId", async (c) => {
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.members.remove");
  const memberId = zPrefixedId("workspaceMember").parse(c.req.param("memberId"));
  const container = c.get("container");
  await container.services.removeWorkspaceMember.execute({
    workspaceId: workspace.id,
    actorMemberId: me.id,
    targetMemberId: memberId,
  });
  c.get("log")?.set({
    action: "workspace.member.remove",
    member: { id: memberId },
  });
  return c.body(null, 204);
});

workspaces.patch("/:slug/members/:memberId/role", async (c) => {
  const body = changeMemberRoleSchema.parse(await c.req.json());
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.members.change_role");
  const memberId = zPrefixedId("workspaceMember").parse(c.req.param("memberId"));
  const container = c.get("container");
  await container.services.changeMemberRole.execute({
    workspaceId: workspace.id,
    actorMemberId: me.id,
    targetMemberId: memberId,
    newRoleId: body.roleId as WorkspaceRoleId,
  });
  c.get("log")?.set({
    action: "workspace.member.change_role",
    member: { id: memberId },
    result: { roleId: body.roleId },
  });
  return c.body(null, 204);
});

workspaces.post("/:slug/invites", async (c) => {
  const body = inviteMemberSchema.parse(await c.req.json());
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.members.invite");
  const container = c.get("container");
  const invite = await container.services.inviteMember.execute({
    workspaceId: workspace.id,
    invitedById: me.id,
    email: body.email,
    roleId: (body.roleId as WorkspaceRoleId | undefined) ?? null,
  });
  c.get("log")?.set({
    action: "invite.create",
    invite: { id: invite.id, email: body.email, roleId: body.roleId ?? null },
  });
  const role = invite.roleId
    ? await container.uow.read((tx) => tx.workspaceRoles.findById(invite.roleId!))
    : null;
  return c.json({ invite: workspaceInviteToDTO(invite, role) }, 201);
});

workspaces.get("/:slug/invites", async (c) => {
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.members.invite");
  const container = c.get("container");
  const rawQ = c.req.query("q");
  const q =
    typeof rawQ === "string" && rawQ.trim().length > 0 ? rawQ.trim().slice(0, 160) : undefined;
  const { invites, rolesById } = await container.uow.read(async (tx) => {
    const invites = await tx.workspaceInvites.listPendingForWorkspace(workspace.id, { query: q });
    const roleIds = [
      ...new Set(invites.map((i) => i.roleId).filter(Boolean) as WorkspaceRoleId[]),
    ];
    const rolesById = new Map<string, WorkspaceRole>();
    for (const r of await tx.workspaceRoles.findManyByIds(roleIds)) {
      rolesById.set(r.id, r);
    }
    return { invites, rolesById };
  });
  return c.json(
    invites.map((i) =>
      workspaceInviteToDTO(i, i.roleId ? rolesById.get(i.roleId) ?? null : null),
    ),
  );
});

workspaces.delete("/:slug/invites/:inviteId", async (c) => {
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.members.invite");
  const container = c.get("container");
  const inviteId = zPrefixedId("workspaceInvite").parse(c.req.param("inviteId"));
  await container.services.revokeInvite.execute({
    workspaceId: workspace.id,
    inviteId,
    actorMemberId: me.id,
  });
  return c.body(null, 204);
});

// Roles -----------------------------------------------------------------
workspaces.get("/:slug/roles", async (c) => {
  const { workspace } = await resolveSlug(c);
  const container = c.get("container");
  const rows = await container.services.listRoles.execute(workspace.id);
  return c.json(
    rows.map((row) => workspaceRoleToDTO(row.role, { memberCount: row.memberCount })),
  );
});

workspaces.post("/:slug/roles", async (c) => {
  const body = createRoleSchema.parse(await c.req.json());
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.roles.manage");
  const container = c.get("container");
  const role = await container.services.createRole.execute({
    workspaceId: workspace.id,
    name: body.name,
    description: body.description ?? null,
    permissions: body.permissions,
    actorMemberId: me.id,
  });
  c.get("log")?.set({
    action: "workspace.role.create",
    role: { id: role.id, name: role.name },
  });
  return c.json(workspaceRoleToDTO(role, { memberCount: 0 }), 201);
});

workspaces.patch("/:slug/roles/:roleId", async (c) => {
  const body = updateRoleSchema.parse(await c.req.json());
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.roles.manage");
  const container = c.get("container");
  const roleId = zPrefixedId("workspaceRole").parse(c.req.param("roleId"));
  const role = await container.services.updateRole.execute({
    workspaceId: workspace.id,
    roleId,
    name: body.name,
    description: body.description,
    permissions: body.permissions,
    actorMemberId: me.id,
  });
  const memberCount = await container.uow.read((tx) =>
    tx.workspaceMembers.countByRole(role.id),
  );
  return c.json(workspaceRoleToDTO(role, { memberCount }));
});

workspaces.delete("/:slug/roles/:roleId", async (c) => {
  const { workspace, me } = await resolveSlug(c);
  requirePermission(me, "workspace.roles.manage");
  const container = c.get("container");
  const roleId = zPrefixedId("workspaceRole").parse(c.req.param("roleId"));
  await container.services.deleteRole.execute({
    workspaceId: workspace.id,
    roleId,
    actorMemberId: me.id,
  });
  return c.body(null, 204);
});
