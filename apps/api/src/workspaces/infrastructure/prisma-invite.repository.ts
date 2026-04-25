import type { Prisma } from "@/infrastructure/prisma.ts";
import { WorkspaceInvite, type WorkspaceInviteId } from "../domain/invite.ts";
import type { WorkspaceInviteRepository } from "../domain/repositories.ts";
import type { WorkspaceMemberId } from "../domain/workspace-member.ts";
import type { WorkspaceRoleId } from "../domain/workspace-role.ts";
import type { WorkspaceId } from "../domain/workspace.ts";

type Row = {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  invitedById: string;
  roleId: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
};

function toDomain(row: Row): WorkspaceInvite {
  return WorkspaceInvite.rehydrate({
    id: row.id as WorkspaceInviteId,
    workspaceId: row.workspaceId as WorkspaceId,
    email: row.email,
    token: row.token,
    invitedById: row.invitedById as WorkspaceMemberId,
    roleId: (row.roleId as WorkspaceRoleId | null) ?? null,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
  });
}

export class PrismaWorkspaceInviteRepository implements WorkspaceInviteRepository {
  constructor(private readonly db: Prisma) {}

  async findById(id: WorkspaceInviteId): Promise<WorkspaceInvite | null> {
    const row = await this.db.workspaceInvite.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByToken(token: string): Promise<WorkspaceInvite | null> {
    const row = await this.db.workspaceInvite.findUnique({ where: { token } });
    return row ? toDomain(row) : null;
  }

  async findActiveByEmail(
    workspaceId: WorkspaceId,
    email: string,
  ): Promise<WorkspaceInvite | null> {
    const row = await this.db.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email: email.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    return row ? toDomain(row) : null;
  }

  async listPendingForWorkspace(
    workspaceId: WorkspaceId,
    opts?: { query?: string },
  ): Promise<WorkspaceInvite[]> {
    const q = opts?.query?.trim();
    const rows = await this.db.workspaceInvite.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        revokedAt: null,
        ...(q
          ? {
              email: {
                contains: q,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async hasPendingInviteForEmail(email: string): Promise<boolean> {
    const row = await this.db.workspaceInvite.findFirst({
      where: {
        email: email.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
      },
      select: { id: true },
    });
    return row != null;
  }

  async save(invite: WorkspaceInvite): Promise<void> {
    await this.db.workspaceInvite.upsert({
      where: { id: invite.id },
      create: {
        id: invite.id,
        workspaceId: invite.workspaceId,
        email: invite.email,
        token: invite.token,
        invitedById: invite.invitedById,
        roleId: invite.roleId,
        createdAt: invite.createdAt,
        acceptedAt: invite.acceptedAt,
        revokedAt: invite.revokedAt,
      },
      update: {
        acceptedAt: invite.acceptedAt,
        revokedAt: invite.revokedAt,
      },
    });
  }
}
