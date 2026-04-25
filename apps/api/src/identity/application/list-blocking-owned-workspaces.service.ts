import type { UserId } from "@/identity/domain/user.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";

export interface BlockingOwnedWorkspace {
  id: string;
  name: string;
  slug: string;
}

export interface ListBlockingOwnedWorkspacesResult {
  workspaces: BlockingOwnedWorkspace[];
}

/**
 * Returns workspaces owned by the user. Because `Workspace.ownerId`
 * has `onDelete: Restrict`, every row here blocks account deletion
 * until ownership is transferred or the workspace is deleted.
 */
export class ListBlockingOwnedWorkspacesService {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(userId: UserId): Promise<ListBlockingOwnedWorkspacesResult> {
    return this.uow.read(async (tx) => {
      const rows = await tx.workspaces.findOwnedBy(userId);
      return {
        workspaces: rows.map((r) => ({
          id: String(r.id),
          name: r.name,
          slug: r.slug,
        })),
      };
    });
  }
}
