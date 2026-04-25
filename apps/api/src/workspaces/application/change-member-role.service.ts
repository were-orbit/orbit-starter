import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, ForbiddenError, NotFoundError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import type { WorkspaceRoleId } from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface ChangeMemberRoleCommand {
  workspaceId: WorkspaceId;
  actorMemberId: WorkspaceMemberId;
  targetMemberId: WorkspaceMemberId;
  newRoleId: WorkspaceRoleId;
}

/**
 * Reassign a member's role. Authorization rules enforced here:
 *
 *   1. Actor and target belong to the same workspace.
 *   2. Actor cannot change their own role (use a future transfer-owner
 *      flow for that — this keeps the last-owner invariant simple).
 *   3. Only OWNERs can mint another OWNER or demote an OWNER. Admins
 *      with `workspace.members.change_role` can freely move members
 *      between non-owner roles but cannot touch owners in either
 *      direction.
 *   4. Cannot demote the last OWNER — the workspace must always have
 *      at least one OWNER so `workspace.delete` stays reachable.
 *
 * The `requirePermission(actor, "workspace.members.change_role")` guard
 * runs upstream in the HTTP layer; this service focuses on the
 * cross-aggregate invariants.
 */
export class ChangeMemberRoleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: ChangeMemberRoleCommand): Promise<void> {
    await this.uow.run(async (tx) => {
      const actor = await tx.workspaceMembers.findById(cmd.actorMemberId);
      const target = await tx.workspaceMembers.findById(cmd.targetMemberId);
      if (!actor || !target) throw new NotFoundError("member");
      if (
        actor.workspaceId !== cmd.workspaceId ||
        target.workspaceId !== cmd.workspaceId
      ) {
        throw new ForbiddenError();
      }
      if (actor.id === target.id) {
        throw new ConflictError(
          "member.cannot_change_own_role",
          "cannot change your own role",
        );
      }

      const nextRole = await tx.workspaceRoles.findById(cmd.newRoleId);
      if (!nextRole || nextRole.workspaceId !== cmd.workspaceId) {
        throw new NotFoundError("role");
      }
      if (nextRole.id === target.roleId) return;

      // Owner-mint / owner-demote guard.
      const targetCurrentlyOwner = target.isOwner;
      const nextIsOwner = nextRole.systemKey === "OWNER";
      if ((targetCurrentlyOwner || nextIsOwner) && !actor.isOwner) {
        throw new ForbiddenError("role.owner_mint_forbidden");
      }

      // Last-owner invariant: demoting an owner when they're the only
      // one left would orphan `workspace.delete` permission.
      if (targetCurrentlyOwner && !nextIsOwner) {
        const ownerCount = await tx.workspaceMembers.countOwners(cmd.workspaceId);
        if (ownerCount <= 1) {
          throw new ConflictError(
            "member.last_owner",
            "cannot demote the last workspace owner",
          );
        }
      }

      target.changeRole(
        {
          id: nextRole.id,
          systemKey: nextRole.systemKey,
          permissions: nextRole.permissions,
        },
        actor.id,
        this.clock,
      );
      await tx.workspaceMembers.save(target);
      tx.events.addMany(target.pullEvents());
    });
  }
}
