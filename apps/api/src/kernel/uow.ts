import type { DomainEvent } from "@/kernel/events.ts";
import type { UserRepository } from "@/identity/domain/repositories.ts";
import type {
  WorkspaceInviteRepository,
  WorkspaceMemberRepository,
  WorkspaceRepository,
  WorkspaceRoleRepository,
} from "@/workspaces/domain/repositories.ts";

/**
 * Collects domain events produced inside a `uow.run(...)` block. The UoW
 * dispatches them to the event bus AFTER the transaction commits, so
 * projector handlers never extend the outer transaction budget and always
 * observe committed state.
 */
export interface TxEventCollector {
  add(event: DomainEvent): void;
  addMany(events: readonly DomainEvent[]): void;
}

export interface TxContext {
  users: UserRepository;
  workspaces: WorkspaceRepository;
  workspaceMembers: WorkspaceMemberRepository;
  workspaceInvites: WorkspaceInviteRepository;
  workspaceRoles: WorkspaceRoleRepository;
  events: TxEventCollector;
}

export interface UnitOfWork {
  run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>;
  read<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>;
}
