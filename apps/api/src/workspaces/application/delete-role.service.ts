import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, NotFoundError } from "@/kernel/errors.ts";
import { stampActor } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import type { WorkspaceRoleId } from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface DeleteRoleCommand {
  workspaceId: WorkspaceId;
  roleId: WorkspaceRoleId;
  actorMemberId: WorkspaceMemberId | null;
}

export class DeleteRoleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: DeleteRoleCommand): Promise<void> {
    await this.uow.run(async (tx) => {
      const role = await tx.workspaceRoles.findById(cmd.roleId);
      if (!role || role.workspaceId !== cmd.workspaceId) {
        throw new NotFoundError("role");
      }

      // Short-circuit for system roles so the error code is the one the
      // caller expects, rather than leaking the foreign-key restrict
      // constraint as `role.in_use` via the member-count path.
      role.markDeleted(this.clock);

      const memberCount = await tx.workspaceMembers.countByRole(role.id);
      if (memberCount > 0) {
        throw new ConflictError(
          "role.in_use",
          "reassign all members holding this role before deleting it",
        );
      }

      await tx.workspaceRoles.delete(role.id);
      tx.events.addMany(stampActor(role.pullEvents(), cmd.actorMemberId));
    });
  }
}
