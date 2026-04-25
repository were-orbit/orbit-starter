import type { FeatureCore, FeatureModule } from "@/kernel/feature.ts";
import { AcceptInviteService } from "@/workspaces/application/accept-invite.service.ts";
import { ChangeMemberRoleService } from "@/workspaces/application/change-member-role.service.ts";
import { CreateRoleService } from "@/workspaces/application/create-role.service.ts";
import { CreateWorkspaceService } from "@/workspaces/application/create-workspace.service.ts";
import { DeleteRoleService } from "@/workspaces/application/delete-role.service.ts";
import { DeleteWorkspaceService } from "@/workspaces/application/delete-workspace.service.ts";
import { InviteMemberService } from "@/workspaces/application/invite-member.service.ts";
import { ListMembersService } from "@/workspaces/application/list-members.service.ts";
import { ListRolesService } from "@/workspaces/application/list-roles.service.ts";
import { RemoveWorkspaceMemberService } from "@/workspaces/application/remove-workspace-member.service.ts";
import { RevokeInviteService } from "@/workspaces/application/revoke-invite.service.ts";
import { UpdateRoleService } from "@/workspaces/application/update-role.service.ts";

export interface WorkspacesServices {
  createWorkspace: CreateWorkspaceService;
  deleteWorkspace: DeleteWorkspaceService;
  inviteMember: InviteMemberService;
  acceptInvite: AcceptInviteService;
  revokeInvite: RevokeInviteService;
  listMembers: ListMembersService;
  removeWorkspaceMember: RemoveWorkspaceMemberService;
  changeMemberRole: ChangeMemberRoleService;
  listRoles: ListRolesService;
  createRole: CreateRoleService;
  updateRole: UpdateRoleService;
  deleteRole: DeleteRoleService;
}

export const workspacesFeature: FeatureModule<WorkspacesServices> = {
  name: "workspaces",
  services: (core: FeatureCore) => ({
    createWorkspace: new CreateWorkspaceService(core.uow, core.clock, core.mailer, {
      webOrigin: core.config.webOrigin,
    }),
    deleteWorkspace: new DeleteWorkspaceService(core.uow, core.clock),
    inviteMember: new InviteMemberService(core.uow, core.clock, core.mailer, {
      webOrigin: core.config.webOrigin,
    }),
    acceptInvite: new AcceptInviteService(core.uow, core.clock),
    revokeInvite: new RevokeInviteService(core.uow, core.clock),
    listMembers: new ListMembersService(core.uow),
    removeWorkspaceMember: new RemoveWorkspaceMemberService(core.uow, core.clock),
    changeMemberRole: new ChangeMemberRoleService(core.uow, core.clock),
    listRoles: new ListRolesService(core.uow),
    createRole: new CreateRoleService(core.uow, core.clock),
    updateRole: new UpdateRoleService(core.uow, core.clock),
    deleteRole: new DeleteRoleService(core.uow, core.clock),
  }),
};
