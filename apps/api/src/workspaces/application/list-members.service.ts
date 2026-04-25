import { NotFoundError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { UserId } from "@/identity/domain/user.ts";
import type { WorkspaceMember } from "../domain/workspace-member.ts";
import type { WorkspaceRole } from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

export interface MemberWithUser {
  member: WorkspaceMember;
  role: WorkspaceRole;
  user: {
    id: UserId;
    email: string;
    name: string;
    avatarTone: number;
  };
}

export class ListMembersService {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(
    workspaceId: WorkspaceId,
    options?: { query?: string },
  ): Promise<MemberWithUser[]> {
    return this.uow.read(async (tx) => {
      const ws = await tx.workspaces.findById(workspaceId);
      if (!ws) throw new NotFoundError("workspace");
      const members = await tx.workspaceMembers.listForWorkspace(workspaceId);

      // Resolve distinct roles once per list call so a 100-member workspace
      // doesn't issue 100 role lookups.
      const roleIds = [...new Set(members.map((m) => m.roleId))];
      const roleCache = new Map<string, WorkspaceRole>();
      for (const r of await tx.workspaceRoles.findManyByIds(roleIds)) {
        roleCache.set(r.id, r);
      }

      const results: MemberWithUser[] = [];
      for (const member of members) {
        const user = await tx.users.findById(member.userId);
        const role = roleCache.get(member.roleId);
        if (!user || !role) continue;
        results.push({
          member,
          role,
          user: {
            id: user.id,
            email: user.email.value,
            name: user.name,
            avatarTone: user.avatarTone,
          },
        });
      }
      const q = options?.query?.trim().toLowerCase();
      if (!q) return results;
      return results.filter(
        (row) =>
          row.user.name.toLowerCase().includes(q) || row.user.email.toLowerCase().includes(q),
      );
    });
  }
}
