import type { UserId } from "@/identity/domain/user.ts";
import { ConflictError } from "@/kernel/errors.ts";
import {
  ListBlockingOwnedWorkspacesService,
  type BlockingOwnedWorkspace,
} from "./list-blocking-owned-workspaces.service.ts";

export class AccountDeletionBlockedError extends ConflictError {
  readonly blockingWorkspaces: BlockingOwnedWorkspace[];

  constructor(blockingWorkspaces: BlockingOwnedWorkspace[]) {
    super(
      "account.delete.sole_owner",
      "You own one or more workspaces. Transfer or delete them before deleting your account.",
    );
    this.blockingWorkspaces = blockingWorkspaces;
  }
}

/**
 * Verifies a user may be deleted. Because `Workspace.ownerId` has
 * `onDelete: Restrict`, deletion would fail at the DB anyway; we raise
 * a typed error up front so callers can surface the blocking list.
 */
export class AssertUserCanBeDeletedService {
  constructor(
    private readonly listBlocking: ListBlockingOwnedWorkspacesService,
  ) {}

  async execute(userId: UserId): Promise<void> {
    const { workspaces } = await this.listBlocking.execute(userId);
    if (workspaces.length === 0) return;
    throw new AccountDeletionBlockedError(workspaces);
  }
}
