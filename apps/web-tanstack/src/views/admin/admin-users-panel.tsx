// +feature:auth-admin
import { useEffect, useRef, useState } from "react";
import type { UserWithRole } from "better-auth/plugins/admin";
import {
  BanIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@orbit/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@orbit/ui/input-group";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@orbit/ui/menu";
import { Skeleton } from "@orbit/ui/skeleton";
import { toastManager } from "@orbit/ui/toast";
import { authClient } from "@/lib/auth-client";

const PAGE_SIZE = 25;

export function AdminUsersPanel(): React.ReactElement {
  const [rows, setRows] = useState<UserWithRole[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const searchRef = useRef(debouncedSearch);

  async function refresh(nextOffset = offset, q = searchRef.current) {
    setLoading(true);
    // Better-auth's admin.listUsers searches one field per request. We
    // default to `email` because in this database many users have an
    // empty `name` (the magic-link signup flow doesn't ask for one), so
    // searching `name` for "sean" misses `sean@brydon.io`. Searching the
    // email field with `contains` matches both the local part and the
    // domain — a single behaviour the user can predict.
    const trimmed = q.trim();
    const res = await authClient.admin.listUsers({
      query: {
        limit: PAGE_SIZE,
        offset: nextOffset,
        ...(trimmed
          ? {
              searchField: "email",
              searchValue: trimmed,
              searchOperator: "contains",
            }
          : {}),
      },
    });
    const list = res.data?.users ?? [];
    const count = res.data?.total ?? list.length;
    setRows(list);
    setTotal(count);
    setOffset(nextOffset);
    setLoading(false);
  }

  // Re-fetch when the debounced search changes; reset to offset 0.
  useEffect(() => {
    searchRef.current = debouncedSearch;
    void refresh(0, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  async function run<T>(
    key: string,
    fn: () => Promise<T>,
    successMessage: string,
  ) {
    setBusy(key);
    try {
      await fn();
      toastManager.add({ title: successMessage });
      await refresh();
    } catch (err) {
      toastManager.add({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function setRole(userId: string, role: "admin" | "user") {
    await run(
      `role:${userId}`,
      () => authClient.admin.setRole({ userId, role }),
      role === "admin" ? "Promoted to admin" : "Demoted to user",
    );
  }

  async function banUser(userId: string) {
    await run(
      `ban:${userId}`,
      () => authClient.admin.banUser({ userId }),
      "User banned",
    );
  }

  async function unbanUser(userId: string) {
    await run(
      `unban:${userId}`,
      () => authClient.admin.unbanUser({ userId }),
      "User unbanned",
    );
  }

  async function impersonate(userId: string) {
    setBusy(`imp:${userId}`);
    try {
      await authClient.admin.impersonateUser({ userId });
      // Reload to pick up the impersonated session cookie.
      window.location.assign("/");
    } catch (err) {
      toastManager.add({
        title: "Impersonation failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setBusy(null);
    }
  }

  if (loading && !rows) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Search by email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>
      {!rows || rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {debouncedSearch ? "No users match." : "No users."}
        </p>
      ) : (
      <ul className="divide-y rounded-md border">
        {rows.map((u) => (
          <li key={u.id} className="flex items-center justify-between p-3">
            <div className="min-w-0 space-y-0.5 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <span className="truncate">{u.name || u.email}</span>
                {u.role === "admin" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    <ShieldCheckIcon className="size-3" />
                    admin
                  </span>
                ) : null}
                {u.banned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                    <BanIcon className="size-3" />
                    banned
                  </span>
                ) : null}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {u.email}
              </div>
            </div>
            <Menu>
              <MenuTrigger
                render={
                  <Button variant="ghost" size="sm" disabled={busy?.endsWith(u.id)}>
                    {busy?.endsWith(u.id) ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <MoreHorizontalIcon className="size-4" />
                    )}
                  </Button>
                }
              />
              <MenuPopup align="end" className="w-48">
                {u.role === "admin" ? (
                  <MenuItem onClick={() => setRole(u.id, "user")}>
                    <UserRoundIcon />
                    <span>Demote to user</span>
                  </MenuItem>
                ) : (
                  <MenuItem onClick={() => setRole(u.id, "admin")}>
                    <ShieldCheckIcon />
                    <span>Promote to admin</span>
                  </MenuItem>
                )}
                {u.banned ? (
                  <MenuItem onClick={() => unbanUser(u.id)}>
                    <UserMinusIcon />
                    <span>Unban</span>
                  </MenuItem>
                ) : (
                  <MenuItem onClick={() => banUser(u.id)}>
                    <BanIcon />
                    <span>Ban</span>
                  </MenuItem>
                )}
                <MenuItem onClick={() => impersonate(u.id)}>
                  <UserRoundIcon />
                  <span>Impersonate</span>
                </MenuItem>
              </MenuPopup>
            </Menu>
          </li>
        ))}
      </ul>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {rows && rows.length > 0
            ? `${offset + 1}–${Math.min(offset + rows.length, total)} of ${total}`
            : `0 of ${total}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => refresh(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!rows || offset + rows.length >= total || loading}
            onClick={() => refresh(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
// -feature:auth-admin
