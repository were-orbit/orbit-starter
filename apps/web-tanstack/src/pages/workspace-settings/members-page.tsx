import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { AVATAR_TONE_COUNT } from "@orbit/ui/lib/avatar-tones";
import type {
  WorkspaceInviteDTO,
  WorkspaceMemberDTO,
  WorkspaceRoleDTO,
  WorkspaceRoleId,
} from "@orbit/shared/dto";
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
import { Input } from "@orbit/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@orbit/ui/input-group";
import { Label } from "@orbit/ui/label";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@orbit/ui/menu";
import { Skeleton } from "@orbit/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@orbit/ui/tabs";
import { toastManager } from "@orbit/ui/toast";
import { cn } from "@orbit/ui/lib/utils";
import { MemberAvatar } from "@/components/member-avatar";
import { ApiError, api } from "@/lib/api/client";
import { useCan } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceSlug } from "@/lib/use-workspace-slug";
import {
  initialsFor,
  inviteMember,
  memberDisplayName,
  memberToView,
  removeWorkspaceMember,
  titleFromEmail,
  useMeUserIdFromQueryCache,
  useWorkspace,
  type Member,
} from "@/lib/workspace";
import { SettingsSection } from "@/pages/workspace-settings/shared";

const LIST_SCROLL =
  "max-h-[min(50vh,22rem)] overflow-y-auto overflow-x-hidden overscroll-contain";

/** Placeholder row count while members / invites load (stable list height, no “Loading…” jump). */
const MEMBER_LIST_SKELETON_ROWS = 6;

function MemberListSkeleton({ label }: { label: string }) {
  return (
    <ul
      className="divide-y divide-border/40"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: MEMBER_LIST_SKELETON_ROWS }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <Skeleton
              className={cn(
                "h-3.5 max-w-[min(100%,14rem)] rounded-md",
                i % 3 === 0 && "w-[42%]",
                i % 3 === 1 && "w-[50%]",
                i % 3 === 2 && "w-[38%]",
              )}
            />
            <Skeleton
              className={cn(
                "h-3 max-w-[min(100%,20rem)] rounded-md",
                i % 3 === 0 && "w-[68%]",
                i % 3 === 1 && "w-[76%]",
                i % 3 === 2 && "w-[62%]",
              )}
            />
          </div>
          <Skeleton className="size-7 shrink-0 rounded-md sm:size-6" />
        </li>
      ))}
    </ul>
  );
}

function useDebouncedValue(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Visual-only `Member` so pending rows reuse `MemberAvatar` + the same text stack as accepted rows. */
function memberStubFromPendingInvite(inv: WorkspaceInviteDTO): Member {
  const email = inv.email;
  const name = titleFromEmail(email);
  let h = 0;
  for (let i = 0; i < inv.id.length; i++) h = (h + inv.id.charCodeAt(i)) | 0;
  return {
    // Pending invites reuse the `Member` shape for rendering only; we
    // brand the invite id into the member id slot because no code
    // resolves this back to a real workspace member.
    id: inv.id as unknown as Member["id"],
    name,
    email,
    initials: initialsFor(name, email),
    tone: Math.abs(h) % AVATAR_TONE_COUNT,
    // Pending-invite stubs aren't real members yet — the invite may
    // or may not carry a roleId. Either way the UI only uses this
    // stub to render an avatar + name; role-gated affordances are
    // already hidden on stub rows.
    role: inv.role ?? null,
  };
}

export function WorkspaceMembersPage() {
  const ws = useWorkspace();
  const workspaceSlug = useWorkspaceSlug() ?? ws?.slug;
  const meUserId = useMeUserIdFromQueryCache();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [listTab, setListTab] = useState<"accepted" | "pending">("accepted");
  const [searchRaw, setSearchRaw] = useState("");
  const searchDebounced = useDebouncedValue(searchRaw, 280);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<WorkspaceInviteDTO | null>(
    null,
  );

  const viewerIsOwner = useMemo(
    () => ws?.members.some((m) => m.isYou && m.role?.systemKey === "OWNER") ?? false,
    [ws?.members],
  );
  const canInvite = useCan("workspace.members.invite");
  const canRemove = useCan("workspace.members.remove");
  const canChangeRole = useCan("workspace.members.change_role");

  const rolesQuery = useQuery({
    queryKey: queryKeys.workspaceRoles(workspaceSlug ?? ""),
    queryFn: () => {
      if (!workspaceSlug) throw new Error("missing slug");
      return api.workspaces.listRoles(workspaceSlug);
    },
    enabled: Boolean(workspaceSlug) && (canChangeRole || canInvite),
    staleTime: 60_000,
  });
  const roles = rolesQuery.data ?? [];
  const defaultInviteRoleId = useMemo<WorkspaceRoleId | null>(() => {
    const member = roles.find((r) => r.systemKey === "MEMBER");
    return member?.id ?? null;
  }, [roles]);
  const [inviteRoleId, setInviteRoleId] = useState<WorkspaceRoleId | null>(null);
  useEffect(() => {
    if (inviteRoleId == null) setInviteRoleId(defaultInviteRoleId);
  }, [defaultInviteRoleId, inviteRoleId]);
  const inviteRole = roles.find((r) => r.id === inviteRoleId) ?? null;

  const membersQuery = useQuery({
    queryKey: [
      ...queryKeys.workspaceMembers(workspaceSlug ?? ""),
      searchDebounced,
    ],
    queryFn: () => {
      if (!workspaceSlug) throw new Error("missing slug");
      return api.workspaces.listMembers(workspaceSlug, {
        q: searchDebounced.trim() || undefined,
      });
    },
    enabled: Boolean(workspaceSlug) && listTab === "accepted",
    staleTime: 30_000,
  });

  const invitesQuery = useQuery({
    queryKey: [
      ...queryKeys.workspaceInvites(workspaceSlug ?? ""),
      searchDebounced,
    ],
    queryFn: () => {
      if (!workspaceSlug) throw new Error("missing slug");
      return api.workspaces.listInvites(workspaceSlug, {
        q: searchDebounced.trim() || undefined,
      });
    },
    enabled: Boolean(workspaceSlug) && canInvite && listTab === "pending",
    staleTime: 30_000,
  });

  const acceptedMembers: Member[] = useMemo(() => {
    const rows = membersQuery.data;
    if (!rows || !meUserId) return [];
    return rows.map((m: WorkspaceMemberDTO) => memberToView(m, meUserId));
  }, [membersQuery.data, meUserId]);

  if (!ws || !workspaceSlug) return null;

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    const trimmed = inviteEmail.trim();
    setInviteBusy(true);
    try {
      const ok = await inviteMember(inviteEmail, {
        roleId: inviteRoleId ?? undefined,
      });
      if (!ok) {
        setInviteError("Could not send invite. Check the email or try again.");
        return;
      }
      setInviteEmail("");
      toastManager.add({
        type: "success",
        title: "Invite sent",
        description: `An invitation link will be sent to ${trimmed}.`,
        timeout: 4000,
      });
    } finally {
      setInviteBusy(false);
    }
  };

  const runChangeRole = async (m: Member, newRole: WorkspaceRoleDTO) => {
    if (!m.role) return;
    if (m.role.id === newRole.id) return;
    try {
      await api.workspaces.changeMemberRole(
        workspaceSlug,
        m.id as Parameters<typeof api.workspaces.changeMemberRole>[1],
        newRole.id,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers(workspaceSlug),
      });
      toastManager.add({
        type: "success",
        title: "Role changed",
        description: `${memberDisplayName(m)} is now ${newRole.name}.`,
        timeout: 3500,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "role.owner_mint_forbidden"
            ? "Only owners can promote or demote other owners."
            : err.code === "member.last_owner"
              ? "You cannot demote the last workspace owner."
              : err.code === "member.cannot_change_own_role"
                ? "You cannot change your own role."
                : err.message
          : "Something went wrong.";
      toastManager.add({
        type: "error",
        title: "Could not change role",
        description: msg,
        timeout: 5000,
      });
    }
  };

  const runRemoveMember = async (m: Member) => {
    const label = memberDisplayName(m);
    setRemovingId(m.id);
    try {
      await removeWorkspaceMember(m.id);
      toastManager.add({
        type: "success",
        title: "Member removed",
        description: `${label} no longer has access.`,
        timeout: 4000,
      });
      setRemoveTarget(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "member.last_owner"
            ? "You cannot remove the last workspace owner."
            : err.code === "member.cannot_remove_self"
              ? "You cannot remove yourself."
              : err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
      toastManager.add({
        type: "error",
        title: "Could not remove member",
        description: msg,
        timeout: 5000,
      });
    } finally {
      setRemovingId(null);
    }
  };

  const runRevokeInvite = async (inv: WorkspaceInviteDTO) => {
    setRevokingId(inv.id);
    try {
      await api.workspaces.revokeInvite(workspaceSlug, inv.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceInvites(workspaceSlug),
      });
      toastManager.add({
        type: "success",
        title: "Invite revoked",
        description: `${inv.email} will no longer be able to use that link.`,
        timeout: 4000,
      });
      setRevokeTarget(null);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Something went wrong.";
      toastManager.add({
        type: "error",
        title: "Could not revoke invite",
        description: msg,
        timeout: 5000,
      });
    } finally {
      setRevokingId(null);
    }
  };

  const membersLoading = listTab === "accepted" && membersQuery.isPending;
  const invitesLoading = listTab === "pending" && invitesQuery.isPending;
  const membersError = listTab === "accepted" && membersQuery.isError;
  const invitesError = listTab === "pending" && invitesQuery.isError;

  const searchBlock = (
    <div className="border-border/40 border-b px-4 py-3">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          value={searchRaw}
          onChange={(e) => setSearchRaw(e.target.value)}
          placeholder={
            listTab === "accepted"
              ? "Search members by name or email…"
              : "Search pending invites by email…"
          }
          aria-label="Search members or invites"
        />
      </InputGroup>
    </div>
  );

  const acceptedList = (
    <div className={LIST_SCROLL}>
      {membersError ? (
        <p className="px-4 py-6 text-center text-[13px] text-rose-600 dark:text-rose-400">
          Could not load members.
        </p>
      ) : membersLoading ? (
        <MemberListSkeleton label="Loading members" />
      ) : acceptedMembers.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          {searchDebounced.trim()
            ? "No members match that search."
            : "No members yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {acceptedMembers.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              viewerIsOwner={viewerIsOwner}
              canRemove={canRemove}
              canChangeRole={canChangeRole}
              roles={roles}
              removing={removingId === m.id}
              onRequestRemove={() => setRemoveTarget(m)}
              onChangeRole={(role) => void runChangeRole(m, role)}
            />
          ))}
        </ul>
      )}
    </div>
  );

  const pendingList = (
    <div className={LIST_SCROLL}>
      {invitesError ? (
        <p className="px-4 py-6 text-center text-[13px] text-rose-600 dark:text-rose-400">
          Could not load invites.
        </p>
      ) : invitesLoading ? (
        <MemberListSkeleton label="Loading pending invites" />
      ) : !invitesQuery.data?.length ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          {searchDebounced.trim()
            ? "No pending invites match that search."
            : "No pending invites."}
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {invitesQuery.data.map((inv) => {
            const stub = memberStubFromPendingInvite(inv);
            return (
              <li
                key={inv.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20"
              >
                <MemberAvatar member={stub} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-tight">
                    {memberDisplayName(stub)}
                  </div>
                  <div className="truncate font-mono text-[12px] text-muted-foreground">
                    {inv.email}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="relative shrink-0 text-muted-foreground transition-[color,scale] duration-150 ease-out hover:text-rose-600 active:scale-[0.94] before:absolute before:-inset-2 before:content-[''] dark:hover:text-rose-400"
                  disabled={revokingId === inv.id}
                  aria-label={`Revoke invite to ${inv.email}`}
                  title="Revoke invite"
                  onClick={() => setRevokeTarget(inv)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const inviteForm = canInvite ? (
    <form
      onSubmit={onInvite}
      className="bg-muted/20 px-4 pt-4 pb-5 shadow-[inset_0_1px_0_rgba(0,0,0,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
      aria-label="Invite a teammate by email"
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Label
            htmlFor="ws-invite-email"
            className="text-muted-foreground text-xs"
          >
            Invite by email
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="ws-invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                if (inviteError) setInviteError(null);
              }}
              placeholder="name@company.com"
              autoComplete="email"
              className="min-w-0 sm:flex-1"
            />
            {/* Role picker. Excludes OWNER — the server rejects
                invite-as-owner and the UI reflects that rather than
                offering an option that would fail. */}
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                  >
                    <span className="truncate">
                      {inviteRole?.name ?? "Role"}
                    </span>
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                }
              />
              <MenuPopup>
                {roles
                  .filter((r) => r.systemKey !== "OWNER")
                  .map((r) => (
                    <MenuItem key={r.id} onClick={() => setInviteRoleId(r.id)}>
                      {r.name}
                    </MenuItem>
                  ))}
              </MenuPopup>
            </Menu>
            <Button
              type="submit"
              className="w-full shrink-0 sm:w-auto"
              disabled={inviteBusy || !inviteEmail.trim()}
            >
              {inviteBusy ? "Sending…" : "Send invite"}
            </Button>
          </div>
          {inviteError ? (
            <p className="text-[12px] text-rose-600 text-pretty dark:text-rose-400">
              {inviteError}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  ) : (
    <div className="flex gap-3 bg-muted/10 px-4 py-3 shadow-[inset_0_1px_0_rgba(0,0,0,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
      <div className="size-8 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-[12px] text-muted-foreground text-pretty">
        Your role doesn't include permission to invite teammates. Ask a
        workspace owner or admin.
      </p>
    </div>
  );

  const cardClassName =
    "overflow-hidden rounded-xl bg-card/40 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]";

  return (
    <div className="space-y-10">
      <SettingsSection
        title="Members"
        description="People who can access rooms in this workspace."
      >
        {canInvite ? (
          <Tabs
            value={listTab}
            onValueChange={(v) => {
              if (v === "accepted" || v === "pending") setListTab(v);
            }}
            className="flex flex-col gap-3"
          >
            <TabsList className="h-auto w-full min-w-0 justify-start rounded-lg bg-transparent p-0 sm:w-auto">
              <TabsTrigger value="accepted" className="flex-1 sm:flex-initial">
                Accepted
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 sm:flex-initial">
                Pending
              </TabsTrigger>
            </TabsList>
            <div className={cardClassName}>
              {searchBlock}
              <TabsContent value="accepted" className="mt-0 outline-none">
                {acceptedList}
              </TabsContent>
              <TabsContent value="pending" className="mt-0 outline-none">
                {pendingList}
              </TabsContent>
              {inviteForm}
            </div>
          </Tabs>
        ) : (
          <div className={cardClassName}>
            {searchBlock}
            {acceptedList}
            {inviteForm}
          </div>
        )}
      </SettingsSection>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `${memberDisplayName(removeTarget)} will lose access to every room in this workspace. This cannot be undone from their side without a new invite.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              render={<AlertDialogClose />}
              disabled={Boolean(removingId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(removingId) || !removeTarget}
              loading={Boolean(removeTarget && removingId === removeTarget.id)}
              onClick={() => {
                if (removeTarget) void runRemoveMember(removeTarget);
              }}
            >
              Remove member
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget
                ? `The pending invite to ${revokeTarget.email} will stop working. You can send a new invite later if you change your mind.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              render={<AlertDialogClose />}
              disabled={Boolean(revokingId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(revokingId) || !revokeTarget}
              loading={Boolean(revokeTarget && revokingId === revokeTarget.id)}
              onClick={() => {
                if (revokeTarget) void runRevokeInvite(revokeTarget);
              }}
            >
              Revoke invite
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

function MemberRow({
  member: m,
  viewerIsOwner,
  canRemove,
  canChangeRole,
  roles,
  removing,
  onRequestRemove,
  onChangeRole,
}: {
  member: Member;
  viewerIsOwner: boolean;
  canRemove: boolean;
  canChangeRole: boolean;
  roles: readonly WorkspaceRoleDTO[];
  removing: boolean;
  onRequestRemove: () => void;
  onChangeRole: (role: WorkspaceRoleDTO) => void;
}) {
  const showRemove = canRemove && !m.isYou;
  // Only owners can assign/revoke the OWNER role; everyone else with
  // `workspace.members.change_role` can shuffle between non-owner roles.
  const showRolePicker =
    canChangeRole && !m.isYou && m.role !== null && (viewerIsOwner || m.role.systemKey !== "OWNER");
  const targetIsOwner = m.role?.systemKey === "OWNER";

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20">
      <MemberAvatar member={m} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium leading-tight">
          {memberDisplayName(m)}
        </div>
        {m.email ? (
          <div className="truncate font-mono text-[12px] text-muted-foreground">
            {m.email}
          </div>
        ) : null}
      </div>
      {showRolePicker ? (
        <Menu>
          <MenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 text-muted-foreground"
              >
                <span className="text-[12px]">{m.role?.name ?? "Role"}</span>
                <ChevronDownIcon className="size-3.5" />
              </Button>
            }
          />
          <MenuPopup>
            {roles.map((r) => {
              // Non-owners cannot assign OWNER; block the menu option
              // rather than rely on the server rejection alone.
              const disabled =
                !viewerIsOwner && (r.systemKey === "OWNER" || targetIsOwner);
              if (disabled) return null;
              return (
                <MenuItem key={r.id} onClick={() => onChangeRole(r)}>
                  {r.name}
                </MenuItem>
              );
            })}
          </MenuPopup>
        </Menu>
      ) : m.role ? (
        <span
          className={cn(
            "shrink-0 rounded-md bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
          )}
        >
          {m.role.name}
        </span>
      ) : null}
      {m.isYou ? (
        <span
          className={cn(
            "shrink-0 rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
          )}
        >
          You
        </span>
      ) : null}
      {showRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="relative shrink-0 text-muted-foreground transition-[color,scale] duration-150 ease-out hover:text-rose-600 active:scale-[0.94] before:absolute before:-inset-2 before:content-[''] dark:hover:text-rose-400"
          disabled={removing}
          aria-label={`Remove ${memberDisplayName(m)}`}
          title="Remove member"
          onClick={onRequestRemove}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      ) : null}
    </li>
  );
}
