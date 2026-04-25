import { Hono } from "hono";
import type { UserId } from "@/identity/domain/user.ts";
import {
  workspaceMemberToDTO,
  workspaceToDTO,
} from "@/interfaces/mappers.ts";
import type { HonoEnv } from "../middleware/container.ts";
import { requireSession } from "../middleware/session.ts";
import { acceptInviteSchema } from "../schemas.ts";

export const invites = new Hono<HonoEnv>();

invites.post("/accept", async (c) => {
  const body = acceptInviteSchema.parse(await c.req.json());
  const session = requireSession(c);
  const container = c.get("container");
  c.get("log")?.set({ action: "invite.accept" });
  const { workspace, member } = await container.services.acceptInvite.execute({
    token: body.token,
    userId: session.userId as UserId,
  });
  c.get("log")?.set({
    workspace: { id: workspace.id, slug: workspace.slug },
    member: { id: member.id },
  });
  const { user, role } = await container.uow.read(async (tx) => ({
    user: await tx.users.findById(member.userId),
    role: await tx.workspaceRoles.findById(member.roleId),
  }));
  return c.json({
    workspace: workspaceToDTO(workspace),
    member:
      user && role
        ? workspaceMemberToDTO(
            member,
            { email: user.email.value, name: user.name },
            role,
          )
        : null,
  });
});
