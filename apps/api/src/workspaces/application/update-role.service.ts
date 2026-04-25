import type { Clock } from "@/kernel/clock.ts";
import { ConflictError, NotFoundError } from "@/kernel/errors.ts";
import { stampActor } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import type {
  WorkspaceRole,
  WorkspaceRoleId,
} from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface UpdateRoleCommand {
  workspaceId: WorkspaceId;
  roleId: WorkspaceRoleId;
  name?: string;
  description?: string | null;
  permissions?: readonly string[];
  actorMemberId: WorkspaceMemberId | null;
}

export class UpdateRoleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: UpdateRoleCommand): Promise<WorkspaceRole> {
    return this.uow.run(async (tx) => {
      const role = await tx.workspaceRoles.findById(cmd.roleId);
      if (!role || role.workspaceId !== cmd.workspaceId) {
        throw new NotFoundError("role");
      }

      if (cmd.name !== undefined) {
        // Name uniqueness within the workspace — cheap pre-check so we
        // surface a clean error code instead of a Prisma unique-constraint
        // violation bubbling up from save().
        const all = await tx.workspaceRoles.listForWorkspace(cmd.workspaceId);
        const nameTaken = all.some(
          (r) =>
            r.role.id !== role.id &&
            r.role.name.toLowerCase() === cmd.name!.trim().toLowerCase(),
        );
        if (nameTaken) {
          throw new ConflictError(
            "role.name_taken",
            "a role with that name already exists",
          );
        }
        role.rename(cmd.name, this.clock);
      }

      if (cmd.description !== undefined) {
        role.setDescription(cmd.description, this.clock);
      }

      if (cmd.permissions !== undefined) {
        role.setPermissions(cmd.permissions, this.clock);
      }

      await tx.workspaceRoles.save(role);
      tx.events.addMany(stampActor(role.pullEvents(), cmd.actorMemberId));
      return role;
    });
  }
}
