import type { EventBus } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import {
  WorkspaceMemberJoined,
  WorkspaceMemberLeft,
  WorkspaceMemberRoleChanged,
} from "@/workspaces/domain/workspace-member.ts";
import {
  WorkspaceRoleCreated,
  WorkspaceRoleDeleted,
  WorkspaceRoleUpdated,
} from "@/workspaces/domain/workspace-role.ts";
import {
  workspaceMemberToDTO,
  workspaceRoleToDTO,
} from "@/interfaces/mappers.ts";
import { channels, type RealtimeHub } from "./hub.ts";

/**
 * Fan-out of committed domain events onto the workspace-scoped
 * realtime channel. Each subscription is a thin "load the current DTO
 * and broadcast it" projector — the source of truth remains the DB;
 * realtime just hints clients to refresh local stores without an HTTP
 * round-trip. If the aggregate was deleted between commit and
 * broadcast (rare), we simply skip the broadcast rather than emit a
 * half-hydrated DTO.
 */
export class RealtimeEventPublisher {
  constructor(
    private readonly bus: EventBus,
    private readonly hub: RealtimeHub,
    private readonly uow: UnitOfWork,
  ) {}

  start(): void {
    this.bus.subscribe<WorkspaceMemberJoined>(
      "workspaces.member.joined",
      async (event) => {
        const dto = await this.uow.read(async (tx) => {
          const member = await tx.workspaceMembers.findById(event.memberId);
          if (!member) return null;
          const [user, role] = await Promise.all([
            tx.users.findById(member.userId),
            tx.workspaceRoles.findById(member.roleId),
          ]);
          if (!user || !role) return null;
          return workspaceMemberToDTO(
            member,
            { email: user.email.value, name: user.name },
            role,
          );
        });
        if (!dto) return;
        this.hub.broadcast(channels.workspace(event.workspaceId), {
          type: "workspace.member.joined",
          member: dto,
        });
      },
    );

    this.bus.subscribe<WorkspaceMemberLeft>(
      "workspaces.member.left",
      (event) => {
        this.hub.broadcast(channels.workspace(event.workspaceId), {
          type: "workspace.member.left",
          workspaceMemberId: event.memberId,
        });
      },
    );

    this.bus.subscribe<WorkspaceMemberRoleChanged>(
      "workspaces.member.role_changed",
      async (event) => {
        const dto = await this.uow.read(async (tx) => {
          const member = await tx.workspaceMembers.findById(event.memberId);
          if (!member) return null;
          const [user, role] = await Promise.all([
            tx.users.findById(member.userId),
            tx.workspaceRoles.findById(member.roleId),
          ]);
          if (!user || !role) return null;
          return workspaceMemberToDTO(
            member,
            { email: user.email.value, name: user.name },
            role,
          );
        });
        if (!dto) return;
        this.hub.broadcast(channels.workspace(event.workspaceId), {
          type: "workspace.member.role_changed",
          member: dto,
        });
      },
    );

    this.bus.subscribe<WorkspaceRoleCreated>(
      "workspaces.role.created",
      async (event) => {
        const role = await this.uow.read((tx) =>
          tx.workspaceRoles.findById(event.roleId),
        );
        if (!role) return;
        this.hub.broadcast(channels.workspace(event.workspaceId), {
          type: "workspace.role.created",
          role: workspaceRoleToDTO(role, { memberCount: 0 }),
        });
      },
    );

    this.bus.subscribe<WorkspaceRoleUpdated>(
      "workspaces.role.updated",
      async (event) => {
        const row = await this.uow.read(async (tx) => {
          const role = await tx.workspaceRoles.findById(event.roleId);
          if (!role) return null;
          const memberCount = await tx.workspaceMembers.countByRole(role.id);
          return { role, memberCount };
        });
        if (!row) return;
        this.hub.broadcast(channels.workspace(event.workspaceId), {
          type: "workspace.role.updated",
          role: workspaceRoleToDTO(row.role, { memberCount: row.memberCount }),
        });
      },
    );

    this.bus.subscribe<WorkspaceRoleDeleted>(
      "workspaces.role.deleted",
      (event) => {
        this.hub.broadcast(channels.workspace(event.workspaceId), {
          type: "workspace.role.deleted",
          roleId: event.roleId,
        });
      },
    );


  }
}
