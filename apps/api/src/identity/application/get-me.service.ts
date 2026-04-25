import { UnauthorizedError } from "@/kernel/errors.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { User } from "../domain/user.ts";
import type { WorkspaceMembershipSummary } from "@/workspaces/domain/repositories.ts";

export interface GetMeResult {
  user: User;
  workspaces: WorkspaceMembershipSummary[];
}

export class GetMeService {
  constructor(private readonly uow: UnitOfWork) {}

  async resolveByUserId(userId: string): Promise<GetMeResult> {
    return this.uow.read(async (tx) => {
      const user = await tx.users.findById(userId as never);
      if (!user) throw new UnauthorizedError();
      const workspaces = await tx.workspaceMembers.listSummariesForUser(user.id);
      return { user, workspaces };
    });
  }
}
