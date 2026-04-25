---
name: add-permission
description: Use when adding a new permission to Orbit's PBAC vocabulary. Covers declaring it in packages/shared/src/permissions.ts, gating server routes with requirePermission, gating UI with useCan, and updating system role defaults.
---

# Adding a permission

The permission vocabulary lives in a single file: `packages/shared/src/permissions.ts`. API and frontend both import from it, so a new permission lights up everywhere at once.

## Pick the scope

- **Workspace permission** — checked against `WorkspaceRole`. Format: `workspace.*`, `teams.*`, `billing.*`, etc. Granted to everyone in the workspace regardless of which team they're on.
- **Team permission** — checked against `TeamRole` for a specific team. Format: `team.*`. Only meaningful when the `teams` feature is on.

## Steps

1. **Append the permission** to the appropriate union type:
   - Workspace: `WorkspacePermission` (~line 28)
   - Team: `TeamPermission` (already inside the `// +feature:teams` fence)

2. **Add to the constant array**:
   - `ALL_WORKSPACE_PERMISSIONS` or `ALL_TEAM_PERMISSIONS`

3. **Update system role defaults**. OWNER and TEAM_ADMIN auto-include everything (`DEFAULT_OWNER_PERMISSIONS = ALL_WORKSPACE_PERMISSIONS`, same for team admin), so they pick it up automatically. ADMIN / MEMBER / TEAM_MEMBER need explicit entries:
   - `DEFAULT_ADMIN_PERMISSIONS`
   - `DEFAULT_MEMBER_PERMISSIONS`
   - `DEFAULT_TEAM_MEMBER_PERMISSIONS`

4. **Add a `PermissionDescriptor`** to the relevant `PermissionGroup` in `PERMISSION_GROUPS`. This is what shows up in the UI's role editor — the user-facing label + description.

5. **Gate the server route**:
   ```ts
   .post("/path", requirePermission("workspace.foo.bar"), handler)
   // or for team scope:
   .post("/path", requireTeamPermission("team.foo.bar"), handler)
   ```

6. **Gate the UI**:
   ```tsx
   const can = useCan();
   if (!can("workspace.foo.bar")) return null;
   // or:
   const canTeam = useCanTeam(teamId, "team.foo.bar");
   ```

## Feature-gated permissions

If the permission only makes sense with a feature on, wrap it in fence markers — and remember to fence EVERY occurrence:

- The branch in the union type
- The entry in `ALL_WORKSPACE_PERMISSIONS` / `ALL_TEAM_PERMISSIONS`
- The descriptor in `PERMISSION_GROUPS`
- Any default-role assignment

```ts
```

## Sanity check

- `isPermission("workspace.foo.bar")` returns `true`
- The new permission appears in the role editor UI
- The server returns 403 when the role lacks it
- `npm run typecheck` passes (the union narrows everywhere it's referenced)
