import type { Clock } from "@/kernel/clock.ts";
import { ForbiddenError, NotFoundError } from "@/kernel/errors.ts";
import { stampActor } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { WorkspaceInviteId } from "../domain/invite.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface RevokeInviteCommand {
  workspaceId: WorkspaceId;
  inviteId: WorkspaceInviteId;
  actorMemberId: WorkspaceMemberId | null;
}

export class RevokeInviteService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: RevokeInviteCommand): Promise<void> {
    await this.uow.run(async (tx) => {
      const invite = await tx.workspaceInvites.findById(cmd.inviteId);
      if (!invite) throw new NotFoundError("invite");
      if (invite.workspaceId !== cmd.workspaceId) throw new ForbiddenError();
      invite.revoke(this.clock);
      await tx.workspaceInvites.save(invite);
      tx.events.addMany(stampActor(invite.pullEvents(), cmd.actorMemberId));
    });
  }
}
