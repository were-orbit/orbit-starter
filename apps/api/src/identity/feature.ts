import type { FeatureCore, FeatureModule } from "@/kernel/feature.ts";
import { GetMeService } from "@/identity/application/get-me.service.ts";
import { UpdatePreferencesService } from "@/identity/application/update-preferences.service.ts";
import { ListBlockingOwnedWorkspacesService } from "@/identity/application/list-blocking-owned-workspaces.service.ts";
import { AssertUserCanBeDeletedService } from "@/identity/application/assert-user-can-be-deleted.service.ts";

export interface IdentityServices {
  getMe: GetMeService;
  updatePreferences: UpdatePreferencesService;
  listBlockingOwnedWorkspaces: ListBlockingOwnedWorkspacesService;
  assertUserCanBeDeleted: AssertUserCanBeDeletedService;
}

export const identityFeature: FeatureModule<IdentityServices> = {
  name: "identity",
  services: (core: FeatureCore) => {
    const listBlockingOwnedWorkspaces = new ListBlockingOwnedWorkspacesService(
      core.uow,
    );
    const assertUserCanBeDeleted = new AssertUserCanBeDeletedService(
      listBlockingOwnedWorkspaces,
    );
    return {
      getMe: new GetMeService(core.uow),
      updatePreferences: new UpdatePreferencesService(core.uow, core.clock),
      listBlockingOwnedWorkspaces,
      assertUserCanBeDeleted,
    };
  },
};
