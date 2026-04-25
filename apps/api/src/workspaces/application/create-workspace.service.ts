import type { UserId } from "@/identity/domain/user.ts";
import type { Clock } from "@/kernel/clock.ts";
import { ConflictError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { Mailer } from "@/infrastructure/mailer.ts";
import { Email } from "@/identity/domain/email.ts";
import {
  WORKSPACE_ROLE_SYSTEM_KEYS,
  type WorkspaceRoleSystemKey,
} from "@orbit/shared/permissions";
import { WorkspaceInvite } from "../domain/invite.ts";
import { WorkspaceMember } from "../domain/workspace-member.ts";
import { WorkspaceRole } from "../domain/workspace-role.ts";
import { WorkspaceSlug } from "../domain/workspace-slug.ts";
import { Workspace } from "../domain/workspace.ts";

export interface CreateWorkspaceCommand {
  ownerUserId: UserId;
  name: string;
  slug: string;
  invites?: string[];
}

export interface CreateWorkspaceResult {
  workspace: Workspace;
  you: WorkspaceMember;
  invites: WorkspaceInvite[];
}

export class CreateWorkspaceService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly mailer: Mailer,
    private readonly config: { webOrigin: string },
  ) {}

  async execute(cmd: CreateWorkspaceCommand): Promise<CreateWorkspaceResult> {
    const slug = WorkspaceSlug.parse(cmd.slug);
    const inviteEmails = (cmd.invites ?? []).map((e) => Email.parse(e));

    const result = await this.uow.run(async (tx) => {
      const existing = await tx.workspaces.findBySlug(slug.value);
      if (existing) {
        throw new ConflictError("workspace.slug_taken", `slug '${slug.value}' is taken`);
      }

      const owner = await tx.users.findById(cmd.ownerUserId);
      if (!owner) throw new Error("owner not found");

      const workspace = Workspace.open(
        { slug, name: cmd.name, ownerId: cmd.ownerUserId },
        this.clock,
      );
      await tx.workspaces.save(workspace);

      // Seed the three system workspace roles (OWNER/ADMIN/MEMBER) before
      // the first member is created so the owner can be placed on OWNER
      // via the same FK mechanism every other member uses.
      const seededRoles = new Map<WorkspaceRoleSystemKey, WorkspaceRole>();
      for (const key of WORKSPACE_ROLE_SYSTEM_KEYS) {
        const role = WorkspaceRole.seedSystem(
          { workspaceId: workspace.id, key },
          this.clock,
        );
        await tx.workspaceRoles.save(role);
        seededRoles.set(key, role);
      }
      const ownerRole = seededRoles.get("OWNER")!;

      const ownerMember = WorkspaceMember.join(
        {
          workspaceId: workspace.id,
          userId: cmd.ownerUserId,
          role: {
            id: ownerRole.id,
            systemKey: ownerRole.systemKey,
            permissions: ownerRole.permissions,
          },
          seed: owner.email.value,
        },
        this.clock,
      );
      await tx.workspaceMembers.save(ownerMember);

      const invites: WorkspaceInvite[] = [];
      for (const email of inviteEmails) {
        const invite = WorkspaceInvite.send(
          {
            workspaceId: workspace.id,
            email,
            invitedById: ownerMember.id,
            roleId: null,
          },
          this.clock,
        );
        await tx.workspaceInvites.save(invite);
        invites.push(invite);
      }

      tx.events.addMany([
        ...workspace.pullEvents(),
        ...[...seededRoles.values()].flatMap((r) => r.pullEvents()),
        ...ownerMember.pullEvents(),
        ...invites.flatMap((i) => i.pullEvents()),
      ]);

      return { workspace, you: ownerMember, invites };
    });

    for (const invite of result.invites) {
      const link = `${this.config.webOrigin}/invites/accept?token=${encodeURIComponent(invite.token)}`;
      await this.mailer.sendInvite({
        to: invite.email,
        workspaceName: result.workspace.name,
        workspaceSlug: result.workspace.slug.value,
        token: invite.token,
        link,
      });
    }

    return result;
  }
}
