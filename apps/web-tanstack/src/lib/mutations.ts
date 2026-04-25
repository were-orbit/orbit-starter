import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import { authClient } from "@/lib/auth-client";
import { bootstrapSession } from "@/lib/db/provider";
import { queryKeys } from "@/lib/query-keys";
import { useOrbitQueryClient } from "@/lib/use-orbit-query-client";
import { createWorkspace, type CreateWorkspaceInput } from "@/lib/workspace";

/** better-auth returns `{ data, error }`; normalize to throws for react-query. */
async function callAuth<T>(
  promise: Promise<{
    data: T | null;
    error: { message?: string; status?: number; code?: string } | null;
  }>,
): Promise<T> {
  const result = await promise;
  if (result.error) {
    throw new ApiError(
      result.error.status ?? 0,
      result.error.code ?? "auth_error",
      result.error.message ?? "Authentication error",
    );
  }
  return result.data as T;
}

export function useBootstrapSessionMutation() {
  return useMutation({ mutationFn: bootstrapSession });
}

export function useCreateWorkspaceMutation() {
  const queryClient = useOrbitQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => createWorkspace(input),
    onSuccess: async (snapshot) => {
      if (snapshot?.workspace.slug) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.workspaceSnapshot(snapshot.workspace.slug),
        });
      }
      queryClient.removeQueries({ queryKey: queryKeys.me() });
    },
  });
}


// +feature:auth-magic-link
export function useRequestMagicLinkMutation() {
  return useMutation({
    mutationFn: (vars: { email: string; callbackURL: string }) =>
      callAuth(
        authClient.signIn.magicLink({
          email: vars.email,
          callbackURL: vars.callbackURL,
        }),
      ),
  });
}
// -feature:auth-magic-link


// +feature:auth-oauth
export function useSignInSocialMutation() {
  return useMutation({
    mutationFn: (vars: { provider: "google" | "apple"; callbackURL: string }) =>
      callAuth(
        authClient.signIn.social({
          provider: vars.provider,
          callbackURL: vars.callbackURL,
        }),
      ),
  });
}
// -feature:auth-oauth

export function useUpdatePreferencesMutation() {
  const queryClient = useOrbitQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updatePreferences>[0]) =>
      api.updatePreferences(body),
    onSuccess: (result) => {
      // Reconcile the cached /v1/me response so useSuspenseQuery
      // consumers see the authoritative server value on next render.
      queryClient.setQueryData(queryKeys.me(), (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        const me = prev as { user?: Record<string, unknown> };
        if (!me.user) return prev;
        return {
          ...me,
          user: {
            ...me.user,
            themeMode: result.themeMode,
            themePalette: result.themePalette,
          },
        };
      });
    },
  });
}
