import { useParams } from "@tanstack/react-router";
import { appStateStore } from "@/lib/stores/app-state";

/** Route param first, then `currentWorkspace.slug` (e.g. outside `/d/*` during hydrate). */
export function useWorkspaceSlug(): string | null {
  const params = useParams({ strict: false });
  const paramSlug = (params as { workspaceSlug?: string }).workspaceSlug;
  if (paramSlug) return paramSlug;
  return appStateStore.state.currentWorkspace?.slug ?? null;
}
