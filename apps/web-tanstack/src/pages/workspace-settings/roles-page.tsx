import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PencilIcon, PlusIcon, ShieldIcon, Trash2Icon } from "lucide-react";
import type {
  WorkspaceRoleDTO,
  WorkspaceRoleId,
} from "@orbit/shared/dto";
import {
  PERMISSION_GROUPS,
  type WorkspacePermission,
} from "@orbit/shared/permissions";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@orbit/ui/alert-dialog";
import { Button } from "@orbit/ui/button";
import { Checkbox } from "@orbit/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@orbit/ui/dialog";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import { Skeleton } from "@orbit/ui/skeleton";
import { Textarea } from "@orbit/ui/textarea";
import { toastManager } from "@orbit/ui/toast";
import { ApiError, api } from "@/lib/api/client";
import { useCan } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceSlug } from "@/lib/use-workspace-slug";
import { useWorkspace } from "@/lib/workspace";
import { SettingsSection } from "@/pages/workspace-settings/shared";

export function WorkspaceRolesPage() {
  const ws = useWorkspace();
  const workspaceSlug = useWorkspaceSlug() ?? ws?.slug;
  const canManage = useCan("workspace.roles.manage");
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkspaceRoleDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceRoleDTO | null>(
    null,
  );
  const [deleting, setDeleting] = useState<WorkspaceRoleId | null>(null);

  const rolesQuery = useQuery({
    queryKey: queryKeys.workspaceRoles(workspaceSlug ?? ""),
    queryFn: () => {
      if (!workspaceSlug) throw new Error("missing slug");
      return api.workspaces.listRoles(workspaceSlug);
    },
    enabled: Boolean(workspaceSlug),
    staleTime: 30_000,
  });

  const roles = rolesQuery.data ?? [];

  if (!ws || !workspaceSlug) return null;

  const runDelete = async (role: WorkspaceRoleDTO) => {
    setDeleting(role.id);
    try {
      await api.workspaces.deleteRole(workspaceSlug, role.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceRoles(workspaceSlug),
      });
      toastManager.add({
        type: "success",
        title: "Role deleted",
        description: `${role.name} has been removed.`,
        timeout: 4000,
      });
      setDeleteTarget(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "role.in_use"
            ? "Reassign the members holding this role first."
            : err.code === "role.system_undeletable"
              ? "Built-in roles can't be deleted."
              : err.message
          : "Something went wrong.";
      toastManager.add({
        type: "error",
        title: "Could not delete role",
        description: msg,
        timeout: 5000,
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-10">
      <SettingsSection
        title="Roles"
        description="Define the permissions each role grants. Built-in roles cover the common cases; add custom roles when you need something different."
      >
        <div className="flex justify-end">
          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1"
            >
              <PlusIcon className="size-3.5" />
              New role
            </Button>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {rolesQuery.isPending ? (
            <RoleListSkeleton />
          ) : rolesQuery.isError ? (
            <p className="text-[13px] text-rose-600 dark:text-rose-400">
              Could not load roles.
            </p>
          ) : roles.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No roles yet.</p>
          ) : (
            roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                canManage={canManage}
                onEdit={() => setEditTarget(role)}
                onDelete={() => setDeleteTarget(role)}
                deleting={deleting === role.id}
              />
            ))
          )}
        </div>
      </SettingsSection>

      <RoleFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceSlug={workspaceSlug}
      />

      <RoleFormDialog
        mode="edit"
        open={editTarget !== null}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null);
        }}
        workspaceSlug={workspaceSlug}
        role={editTarget}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Members currently on <strong>{deleteTarget.name}</strong> must
                  be reassigned first. This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              render={<AlertDialogClose />}
              disabled={Boolean(deleting)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(deleting) || !deleteTarget}
              loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
              onClick={() => {
                if (deleteTarget) void runDelete(deleteTarget);
              }}
            >
              Delete role
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

function RoleListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl bg-card/40 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
          <Skeleton className="mt-3 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function RoleCard({
  role,
  canManage,
  onEdit,
  onDelete,
  deleting,
}: {
  role: WorkspaceRoleDTO;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const permSummary =
    role.permissions.length === 0
      ? "No permissions."
      : `${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"}`;

  return (
    <div className="rounded-xl bg-card/40 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-md bg-muted p-1.5 text-muted-foreground">
          <ShieldIcon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13px] font-semibold leading-tight">
              {role.name}
            </h3>
            {role.isSystem ? (
              <span className="rounded-md bg-muted/80 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Built-in
              </span>
            ) : null}
            <span className="text-[11px] text-muted-foreground">
              {permSummary}
            </span>
            {typeof role.memberCount === "number" ? (
              <span className="text-[11px] text-muted-foreground">
                · {role.memberCount} member{role.memberCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          {role.description ? (
            <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
              {role.description}
            </p>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex shrink-0 gap-1">
            {/* OWNER is permission-locked and not renameable; the edit
                button is hidden entirely rather than rendered disabled to
                keep the UI free of "why is this gray" questions. */}
            {role.systemKey !== "OWNER" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onEdit}
                aria-label={`Edit ${role.name}`}
                title="Edit role"
              >
                <PencilIcon className="size-3.5" />
              </Button>
            ) : null}
            {!role.isSystem ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onDelete}
                disabled={deleting || (role.memberCount ?? 0) > 0}
                aria-label={`Delete ${role.name}`}
                title={
                  (role.memberCount ?? 0) > 0
                    ? "Reassign members first"
                    : "Delete role"
                }
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RoleFormDialog({
  mode,
  open,
  onOpenChange,
  workspaceSlug,
  role,
}: {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceSlug: string;
  role?: WorkspaceRoleDTO | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<WorkspacePermission>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingOwner = role?.systemKey === "OWNER";
  const nameLocked = Boolean(role?.isSystem);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && role) {
      setName(role.name);
      setDescription(role.description ?? "");
      setSelected(new Set(role.permissions));
    } else {
      setName("");
      setDescription("");
      setSelected(new Set());
    }
    setError(null);
  }, [open, mode, role]);

  const toggle = (p: WorkspacePermission) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const perms = [...selected];
      if (mode === "create") {
        await api.workspaces.createRole(workspaceSlug, {
          name: name.trim(),
          description: description.trim() || null,
          permissions: perms,
        });
      } else if (role) {
        await api.workspaces.updateRole(workspaceSlug, role.id, {
          name: nameLocked ? undefined : name.trim(),
          description: description.trim() || null,
          permissions: editingOwner ? undefined : perms,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceRoles(workspaceSlug),
      });
      onOpenChange(false);
      toastManager.add({
        type: "success",
        title: mode === "create" ? "Role created" : "Role updated",
        timeout: 3500,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "role.name_taken") {
          setError("A role with that name already exists.");
        } else if (err.code === "role.owner_locked") {
          setError("The Owner role's permissions can't be edited.");
        } else if (err.code === "role.system_name_locked") {
          setError("Built-in roles can't be renamed.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!nameLocked && !name.trim()) return false;
    return true;
  }, [busy, nameLocked, name]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New role" : `Edit ${role?.name ?? "role"}`}
            </DialogTitle>
            <DialogDescription>
              {editingOwner
                ? "The Owner role's permissions are locked. You can still edit the description."
                : "Pick the permissions this role should grant. You can change these later."}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={nameLocked}
                placeholder="Moderator"
                maxLength={48}
                required={!nameLocked}
              />
              {nameLocked ? (
                <p className="text-[11px] text-muted-foreground">
                  Built-in role names can't be changed.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={240}
                placeholder="Who should have this role?"
              />
            </div>
          </div>

          <fieldset
            className="space-y-3 rounded-lg border border-border/40 p-3"
            disabled={editingOwner}
          >
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Permissions
            </legend>
            {PERMISSION_GROUPS.filter((g) => g.scope === "workspace").map((group) => (
              <div key={group.group} className="space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground">
                  {group.group}
                </div>
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    // Workspace role editor only renders workspace-scoped
                    // groups (see filter above), so the cast is safe.
                    const perm = item.permission as WorkspacePermission;
                    return (
                    <label
                      key={item.permission}
                      className="flex items-start gap-2.5"
                    >
                      <Checkbox
                        checked={selected.has(perm)}
                        onCheckedChange={() => toggle(perm)}
                        disabled={editingOwner}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium leading-tight">
                          {item.label}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>

          {error ? (
            <p className="text-[12px] text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}
          </DialogPanel>
          <DialogFooter>
            <Button variant="outline" render={<DialogClose />} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={busy}>
              {mode === "create" ? "Create role" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
