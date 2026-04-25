import { Store } from "@tanstack/store";
import { useStore } from "@tanstack/react-store";
import type { UserDTO, WorkspaceDTO, WorkspaceMemberId } from "@orbit/shared/dto";

export interface AppState {
  currentUser: UserDTO | null;
  currentWorkspace: WorkspaceDTO | null;
  currentMemberId: WorkspaceMemberId | null;
}

const initial: AppState = {
  currentUser: null,
  currentWorkspace: null,
  currentMemberId: null,
};

export const appStateStore = new Store<AppState>(initial);

export function updateAppState(updater: (draft: AppState) => void | AppState): void {
  appStateStore.setState((prev) => {
    const draft = { ...prev };
    const returned = updater(draft);
    return (returned as AppState) ?? draft;
  });
}

export function resetAppState(): void {
  appStateStore.setState(() => initial);
}

export function useAppState(): AppState {
  return useStore(appStateStore, (s) => s);
}
