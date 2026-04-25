export const queryKeys = {
  root: ["orbit"] as const,
  config: () => [...queryKeys.root, "config"] as const,
  me: () => [...queryKeys.root, "me"] as const,
  accountBlockingWorkspaces: () =>
    [...queryKeys.root, "account", "blocking-workspaces"] as const,
  onboardingIntentStatus: () =>
    [...queryKeys.root, "onboarding", "intent-status"] as const,
  workspace: () => [...queryKeys.root, "workspace"] as const,
  workspaceSnapshot: (slug: string) =>
    [...queryKeys.workspace(), "snapshot", slug] as const,
  workspaceMembers: (slug: string) =>
    [...queryKeys.workspace(), "members", slug] as const,
  workspaceInvites: (slug: string) =>
    [...queryKeys.workspace(), "invites", slug] as const,
  workspaceRoles: (slug: string) =>
    [...queryKeys.workspace(), "roles", slug] as const,
  teams: (slug: string) => [...queryKeys.workspace(), "teams", slug] as const,
  team: (slug: string, teamId: string) =>
    [...queryKeys.teams(slug), teamId] as const,
  teamMembers: (slug: string, teamId: string) =>
    [...queryKeys.team(slug, teamId), "members"] as const,
  teamRoles: (slug: string, teamId: string) =>
    [...queryKeys.team(slug, teamId), "roles"] as const,
  billing: (slug: string) =>
    [...queryKeys.workspace(), "billing", slug] as const,
};
