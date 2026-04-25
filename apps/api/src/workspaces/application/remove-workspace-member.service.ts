import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, ForbiddenError, NotFoundError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import {
  WorkspaceMemberLeft,
  type WorkspaceMemberId,
} from "../domain/workspace-member.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface RemoveWorkspaceMemberCommand {
  workspaceId: WorkspaceId;
  actorMemberId: WorkspaceMemberId;
  targetMemberId: WorkspaceMemberId;
}

export class RemoveWorkspaceMemberService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: RemoveWorkspaceMemberCommand): Promise<void> {
    await this.uow.run(async (tx) => {
      const actor = await tx.workspaceMembers.findById(cmd.actorMemberId);
      const target = await tx.workspaceMembers.findById(cmd.targetMemberId);
      if (!actor || !target) throw new NotFoundError("member");
      if (actor.workspaceId !== cmd.workspaceId || target.workspaceId !== cmd.workspaceId) {
        throw new ForbiddenError();
      }
      // The `workspace.members.remove` permission is enforced by the
      // HTTP layer's `requirePermission` guard. We still block
      // non-owner actors from removing an owner here because the guard
      // only checks the action, not who's being acted upon.
      if (actor.id === target.id) {
        throw new ConflictError("member.cannot_remove_self", "cannot remove yourself");
      }
      if (target.isOwner && !actor.isOwner) {
        throw new ForbiddenError("role.owner_mint_forbidden");
      }
      if (target.isOwner) {
        const ownerCount = await tx.workspaceMembers.countOwners(cmd.workspaceId);
        if (ownerCount <= 1) {
          throw new ConflictError("member.last_owner", "cannot remove the last owner");
        }
      }
      await tx.workspaceMembers.delete(target.id);
      tx.events.add(new WorkspaceMemberLeft(cmd.workspaceId, target.id, this.clock.now()));
    });
  }
}
