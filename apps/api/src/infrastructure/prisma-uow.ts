import { BaseUnitOfWork } from "@/kernel/base-uow.ts";
import type { EventBus } from "@/kernel/events.ts";
import type { TxContext } from "@/kernel/uow.ts";
import { PrismaUserRepository } from "@/identity/infrastructure/prisma-user.repository.ts";
import { PrismaWorkspaceInviteRepository } from "@/workspaces/infrastructure/prisma-invite.repository.ts";
import { PrismaWorkspaceMemberRepository } from "@/workspaces/infrastructure/prisma-workspace-member.repository.ts";
import { PrismaWorkspaceRoleRepository } from "@/workspaces/infrastructure/prisma-workspace-role.repository.ts";
import { PrismaWorkspaceRepository } from "@/workspaces/infrastructure/prisma-workspace.repository.ts";
import type { Prisma } from "./prisma.ts";

type RepoContext = Omit<TxContext, "events">;

export class PrismaUnitOfWork extends BaseUnitOfWork<Prisma> {
  constructor(
    private readonly db: Prisma,
    bus: EventBus,
  ) {
    super(bus);
  }

  protected readHandle(): Prisma {
    return this.db;
  }

  protected openTransaction<T>(
    fn: (handle: Prisma) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction((tx) => fn(tx as unknown as Prisma));
  }

  protected buildContext(db: Prisma): RepoContext {
    return {
      users: new PrismaUserRepository(db),
      workspaces: new PrismaWorkspaceRepository(db),
      workspaceMembers: new PrismaWorkspaceMemberRepository(db),
      workspaceInvites: new PrismaWorkspaceInviteRepository(db),
      workspaceRoles: new PrismaWorkspaceRoleRepository(db),
    };
  }
}
