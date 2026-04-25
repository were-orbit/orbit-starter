import { Email } from "@/identity/domain/email.ts";
import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, ForbiddenError, NotFoundError } from "@/kernel/errors.ts";
import { stampActor } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { Mailer } from "@/infrastructure/mailer.ts";
import { WorkspaceInvite } from "../domain/invite.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import type { WorkspaceRoleId } from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface InviteMemberCommand {
  workspaceId: WorkspaceId;
  invitedById: WorkspaceMemberId;
  email: string;
  /**
   * Role the invitee will land on. Optional — undefined means "use the
   * workspace's MEMBER system role at accept time". Explicit null is
   * the same as undefined; the field exists so callers can disambiguate
   * "no preference" from a dropped-role-id bug.
   */
  roleId?: WorkspaceRoleId | null;
}

export class InviteMemberService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly mailer: Mailer,
    private readonly config: { webOrigin: string },
  ) {}

  async execute(cmd: InviteMemberCommand): Promise<WorkspaceInvite> {
    const email = Email.parse(cmd.email);
    const invite = await this.uow.run(async (tx) => {
      const ws = await tx.workspaces.findById(cmd.workspaceId);
      if (!ws) throw new NotFoundError("workspace");

      let roleId: WorkspaceRoleId | null = null;
      if (cmd.roleId) {
        const role = await tx.workspaceRoles.findById(cmd.roleId);
        if (!role || role.workspaceId !== cmd.workspaceId) {
          throw new NotFoundError("role");
        }
        // Don't let someone invite a new member directly onto the OWNER
        // role — `ChangeMemberRoleService` has the owner-mint guard and
        // we'd bypass it otherwise. Invite as ADMIN or MEMBER and the
        // existing owner can promote afterwards if they want.
        if (role.systemKey === "OWNER") {
          throw new ForbiddenError("invite.owner_role_forbidden");
        }
        roleId = role.id;
      }

      const existingMember = await tx.workspaceMembers.findByWorkspaceAndEmail(
        cmd.workspaceId,
        email.value,
      );
      if (existingMember) {
        throw new ConflictError("invite.already_member", "already a member of this workspace");
      }
      const active = await tx.workspaceInvites.findActiveByEmail(cmd.workspaceId, email.value);
      if (active) return active;

      const invite = WorkspaceInvite.send(
        {
          workspaceId: cmd.workspaceId,
          email,
          invitedById: cmd.invitedById,
          roleId,
        },
        this.clock,
      );
      await tx.workspaceInvites.save(invite);
      tx.events.addMany(stampActor(invite.pullEvents(), cmd.invitedById));
      return invite;
    });

    const link = `${this.config.webOrigin}/invites/accept?token=${encodeURIComponent(invite.token)}`;
    const workspace = await this.uow.read((tx) => tx.workspaces.findById(invite.workspaceId));
    await this.mailer.sendInvite({
      to: invite.email,
      workspaceName: workspace?.name ?? invite.workspaceId,
      workspaceSlug: workspace?.slug.value ?? "",
      token: invite.token,
      link,
    });
    return invite;
  }
}
