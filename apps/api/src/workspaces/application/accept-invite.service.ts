import { Email } from "@/identity/domain/email.ts";
import { User, type UserId } from "@/identity/domain/user.ts";
import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import { WorkspaceMember } from "../domain/workspace-member.ts";
import { Workspace } from "../domain/workspace.ts";

export interface AcceptInviteCommand {
  token: string;
  userId: UserId;
}

export interface AcceptInviteResult {
  workspace: Workspace;
  member: WorkspaceMember;
}

export class AcceptInviteService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: AcceptInviteCommand): Promise<AcceptInviteResult> {
    return this.uow.run(async (tx) => {
      const invite = await tx.workspaceInvites.findByToken(cmd.token);
      if (!invite || !invite.isPending) throw new UnauthorizedError();

      const user = await tx.users.findById(cmd.userId);
      if (!user) throw new UnauthorizedError();
      const inviteEmail = Email.parse(invite.email);
      if (!user.email.equals(inviteEmail)) {
        throw new ConflictError("invite.email_mismatch", "invite was sent to a different email");
      }

      const workspace = await tx.workspaces.findById(invite.workspaceId);
      if (!workspace) throw new UnauthorizedError();

      const existing = await tx.workspaceMembers.findByWorkspaceAndUser(workspace.id, user.id);
      if (existing) {
        invite.accept(existing.id, this.clock);
        await tx.workspaceInvites.save(invite);
        tx.events.addMany(invite.pullEvents());
        return { workspace, member: existing };
      }

      // Prefer the role the inviter chose; fall back to the workspace's
      // MEMBER system role if the invite predates the PBAC migration or
      // the referenced role has since been deleted (SetNull cascade).
      let role = invite.roleId
        ? await tx.workspaceRoles.findById(invite.roleId)
        : null;
      if (!role) {
        role = await tx.workspaceRoles.findByWorkspaceAndSystemKey(
          workspace.id,
          "MEMBER",
        );
      }
      if (!role) throw new NotFoundError("role");

      const member = WorkspaceMember.join(
        {
          workspaceId: workspace.id,
          userId: user.id,
          role: {
            id: role.id,
            systemKey: role.systemKey,
            permissions: role.permissions,
          },
          seed: user.email.value,
        },
        this.clock,
      );
      await tx.workspaceMembers.save(member);
      invite.accept(member.id, this.clock);
      await tx.workspaceInvites.save(invite);

      tx.events.addMany([...member.pullEvents(), ...invite.pullEvents()]);
      return { workspace, member };
    });
  }

  static touchUser(u: User): User {
    return u;
  }
}
