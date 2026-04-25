import type { Prisma } from "@/infrastructure/prisma.ts";
import type { WorkspaceRoleSystemKey } from "@orbit/shared/permissions";
import type {
  WorkspaceRoleRepository,
  WorkspaceRoleWithMemberCount,
} from "../domain/repositories.ts";
import {
  WorkspaceRole,
  type WorkspaceRoleId,
} from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

type Row = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  systemKey: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  permissions?: { permission: string }[];
};

function toDomain(row: Row): WorkspaceRole {
  return WorkspaceRole.rehydrate({
    id: row.id as WorkspaceRoleId,
    workspaceId: row.workspaceId as WorkspaceId,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    systemKey: row.systemKey as WorkspaceRoleSystemKey | null,
    sortOrder: row.sortOrder,
    permissions: (row.permissions ?? []).map((p) => p.permission),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class PrismaWorkspaceRoleRepository implements WorkspaceRoleRepository {
  constructor(private readonly db: Prisma) {}

  async findById(id: WorkspaceRoleId): Promise<WorkspaceRole | null> {
    const row = await this.db.workspaceRole.findUnique({
      where: { id },
      include: { permissions: true },
    });
    return row ? toDomain(row) : null;
  }

  async findManyByIds(
    ids: readonly WorkspaceRoleId[],
  ): Promise<WorkspaceRole[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.workspaceRole.findMany({
      where: { id: { in: [...ids] } },
      include: { permissions: true },
    });
    return rows.map(toDomain);
  }

  async findByWorkspaceAndSystemKey(
    workspaceId: WorkspaceId,
    key: WorkspaceRoleSystemKey,
  ): Promise<WorkspaceRole | null> {
    const row = await this.db.workspaceRole.findUnique({
      where: { workspaceId_systemKey: { workspaceId, systemKey: key } },
      include: { permissions: true },
    });
    return row ? toDomain(row) : null;
  }

  async listForWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<WorkspaceRoleWithMemberCount[]> {
    const rows = await this.db.workspaceRole.findMany({
      where: { workspaceId },
      include: {
        permissions: true,
        _count: { select: { members: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => ({
      role: toDomain(row),
      memberCount: row._count.members,
    }));
  }

  async save(role: WorkspaceRole): Promise<void> {
    // Permissions are persisted alongside the role row in a single
    // transaction so a save never leaves the role in an intermediate
    // state (empty permission set for a partial write).
    await this.db.$transaction(async (tx) => {
      await tx.workspaceRole.upsert({
        where: { id: role.id },
        create: {
          id: role.id,
          workspaceId: role.workspaceId,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          systemKey: role.systemKey,
          sortOrder: role.sortOrder,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
        update: {
          name: role.name,
          description: role.description,
          sortOrder: role.sortOrder,
          updatedAt: role.updatedAt,
        },
      });
      await tx.workspaceRolePermission.deleteMany({ where: { roleId: role.id } });
      if (role.permissions.length > 0) {
        await tx.workspaceRolePermission.createMany({
          data: role.permissions.map((p) => ({ roleId: role.id, permission: p })),
        });
      }
    });
  }

  async delete(id: WorkspaceRoleId): Promise<void> {
    await this.db.workspaceRole.delete({ where: { id } });
  }
}
