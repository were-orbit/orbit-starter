import { NotFoundError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { WorkspaceRoleWithMemberCount } from "../domain/repositories.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export class ListRolesService {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(workspaceId: WorkspaceId): Promise<WorkspaceRoleWithMemberCount[]> {
    return this.uow.read(async (tx) => {
      const ws = await tx.workspaces.findById(workspaceId);
      if (!ws) throw new NotFoundError("workspace");
      return tx.workspaceRoles.listForWorkspace(workspaceId);
    });
  }
}
