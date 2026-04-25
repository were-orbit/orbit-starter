import type { Clock } from "@/kernel/clock.ts";
import { NotFoundError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import { WorkspaceDeleted, type WorkspaceId } from "../domain/workspace.ts";

export interface DeleteWorkspaceCommand {
  workspaceId: WorkspaceId;
  /**
   * The acting member, for audit attribution. May be `null` for
   * background deletes (e.g. a future scheduled-cleanup path).
   */
  deletedByMemberId: WorkspaceMemberId | null;
}

export class DeleteWorkspaceService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: DeleteWorkspaceCommand): Promise<void> {
    await this.uow.run(async (tx) => {
      const ws = await tx.workspaces.findById(cmd.workspaceId);
      if (!ws) throw new NotFoundError("workspace");

      // Snapshot identity fields before the delete cascades so the
      // audit row can render a meaningful name/slug. The DB cascade
      // wipes the workspace row + everything pointing at it.
      tx.events.add(
        new WorkspaceDeleted(
          ws.id,
          ws.slug.value,
          ws.name,
          cmd.deletedByMemberId,
          this.clock.now(),
        ),
      );
      await tx.workspaces.delete(cmd.workspaceId);
    });
  }
}
