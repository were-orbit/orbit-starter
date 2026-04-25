import type { UserId } from "@/identity/domain/user.ts";
import type { Prisma } from "@/infrastructure/prisma.ts";
import {
  isWorkspacePermission,
  type WorkspacePermission,
  type WorkspaceRoleSystemKey,
} from "@orbit/shared/permissions";
import type {
  WorkspaceMemberRepository,
  WorkspaceMembershipSummary,
} from "../domain/repositories.ts";
import {
  WorkspaceMember,
  type WorkspaceMemberId,
  type WorkspaceMemberRoleSnapshot,
} from "../domain/workspace-member.ts";
import type { WorkspaceRoleId } from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

type Row = {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  tone: number;
  createdAt: Date;
  role: {
    id: string;
    systemKey: string | null;
    permissions: { permission: string }[];
  };
};

function toSnapshot(row: Row["role"]): WorkspaceMemberRoleSnapshot {
  const perms: WorkspacePermission[] = [];
  for (const p of row.permissions) {
    if (isWorkspacePermission(p.permission)) perms.push(p.permission);
  }
  return {
    id: row.id as WorkspaceRoleId,
    systemKey: row.systemKey as WorkspaceRoleSystemKey | null,
    permissions: perms,
  };
}

function toDomain(row: Row): WorkspaceMember {
  return WorkspaceMember.rehydrate({
    id: row.id as WorkspaceMemberId,
    workspaceId: row.workspaceId as WorkspaceId,
    userId: row.userId as UserId,
    role: toSnapshot(row.role),
    tone: row.tone,
    createdAt: row.createdAt,
  });
}

const ROLE_INCLUDE = {
  role: { include: { permissions: true } },
} as const;

export class PrismaWorkspaceMemberRepository implements WorkspaceMemberRepository {
  constructor(private readonly db: Prisma) {}

  async findById(id: WorkspaceMemberId): Promise<WorkspaceMember | null> {
    const row = await this.db.workspaceMember.findUnique({
      where: { id },
      include: ROLE_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async findByWorkspaceAndUser(
    workspaceId: WorkspaceId,
    userId: UserId,
  ): Promise<WorkspaceMember | null> {
    const row = await this.db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: ROLE_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async findByWorkspaceAndEmail(
    workspaceId: WorkspaceId,
    email: string,
  ): Promise<WorkspaceMember | null> {
    const row = await this.db.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email: email.toLowerCase() },
      },
      include: ROLE_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async listForWorkspace(workspaceId: WorkspaceId): Promise<WorkspaceMember[]> {
    const rows = await this.db.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include: ROLE_INCLUDE,
    });
    return rows.map(toDomain);
  }

  async listSummariesForUser(userId: UserId): Promise<WorkspaceMembershipSummary[]> {
    const rows = await this.db.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true, role: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id as WorkspaceMemberId,
      workspaceId: row.workspaceId as WorkspaceId,
      slug: row.workspace.slug,
      name: row.workspace.name,
      roleName: row.role.name,
      roleSystemKey: row.role.systemKey as WorkspaceRoleSystemKey | null,
    }));
  }

  async countByRole(roleId: WorkspaceRoleId): Promise<number> {
    return this.db.workspaceMember.count({ where: { roleId } });
  }

  async countOwners(workspaceId: WorkspaceId): Promise<number> {
    return this.db.workspaceMember.count({
      where: { workspaceId, role: { systemKey: "OWNER" } },
    });
  }

  async save(member: WorkspaceMember): Promise<void> {
    await this.db.workspaceMember.upsert({
      where: { id: member.id },
      create: {
        id: member.id,
        workspaceId: member.workspaceId,
        userId: member.userId,
        roleId: member.roleId,
        tone: member.tone,
        createdAt: member.createdAt,
      },
      update: {
        roleId: member.roleId,
      },
    });
  }

  async delete(id: WorkspaceMemberId): Promise<void> {
    await this.db.workspaceMember.deleteMany({ where: { id } });
  }
}
