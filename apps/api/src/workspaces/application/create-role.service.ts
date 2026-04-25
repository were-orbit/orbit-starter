import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, NotFoundError } from "@/kernel/errors.ts";
import { stampActor } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import { WorkspaceRole } from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface CreateRoleCommand {
  workspaceId: WorkspaceId;
  name: string;
  description?: string | null;
  permissions: readonly string[];
  actorMemberId: WorkspaceMemberId | null;
}

export class CreateRoleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: CreateRoleCommand): Promise<WorkspaceRole> {
    return this.uow.run(async (tx) => {
      const ws = await tx.workspaces.findById(cmd.workspaceId);
      if (!ws) throw new NotFoundError("workspace");

      const existing = await tx.workspaceRoles.listForWorkspace(cmd.workspaceId);
      const nameTaken = existing.some(
        (r) => r.role.name.toLowerCase() === cmd.name.trim().toLowerCase(),
      );
      if (nameTaken) {
        throw new ConflictError("role.name_taken", "a role with that name already exists");
      }

      const role = WorkspaceRole.create(
        {
          workspaceId: cmd.workspaceId,
          name: cmd.name,
          description: cmd.description,
          permissions: cmd.permissions,
          // Sort custom roles after all existing rows.
          sortOrder: 100 + existing.length,
        },
        this.clock,
      );
      await tx.workspaceRoles.save(role);
      tx.events.addMany(stampActor(role.pullEvents(), cmd.actorMemberId));
      return role;
    });
  }
}
