import type { UserId } from "@/identity/domain/user.ts";
import type { Prisma } from "@/infrastructure/prisma.ts";
import type { WorkspaceRepository } from "../domain/repositories.ts";
import { WorkspaceSlug } from "../domain/workspace-slug.ts";
import { Workspace, type WorkspaceId } from "../domain/workspace.ts";

type Row = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  createdAt: Date;
};

function toDomain(row: Row): Workspace {
  return Workspace.rehydrate({
    id: row.id as WorkspaceId,
    slug: WorkspaceSlug.parse(row.slug),
    name: row.name,
    ownerId: row.ownerId as UserId,
    createdAt: row.createdAt,
  });
}

export class PrismaWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Prisma) {}

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    const row = await this.db.workspace.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const row = await this.db.workspace.findUnique({ where: { slug } });
    return row ? toDomain(row) : null;
  }

  async findOwnedBy(userId: UserId) {
    const rows = await this.db.workspace.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id as WorkspaceId,
      name: r.name,
      slug: r.slug,
    }));
  }

  async save(workspace: Workspace): Promise<void> {
    await this.db.workspace.upsert({
      where: { id: workspace.id },
      create: {
        id: workspace.id,
        slug: workspace.slug.value,
        name: workspace.name,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
      },
      update: {
        slug: workspace.slug.value,
        name: workspace.name,
      },
    });
  }

  async delete(id: WorkspaceId): Promise<void> {
    await this.db.workspace.deleteMany({ where: { id } });
  }
}
