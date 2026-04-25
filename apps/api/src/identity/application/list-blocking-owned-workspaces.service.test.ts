import { describe, expect, it, vi } from "vitest";
import { ListBlockingOwnedWorkspacesService } from "./list-blocking-owned-workspaces.service.ts";
import type { UserId } from "@/identity/domain/user.ts";

const userId = "user_01" as UserId;

function makeUow(rows: Array<{ id: string; name: string; slug: string }>) {
  const findOwnedBy = vi.fn(async () => rows);
  const uow = {
    read: async <T,>(fn: (tx: unknown) => Promise<T>) =>
      fn({ workspaces: { findOwnedBy } }),
    run: async <T,>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        workspaces: { findOwnedBy },
        events: { add: vi.fn(), addMany: vi.fn() },
      }),
  };
  return { uow, findOwnedBy };
}

describe("ListBlockingOwnedWorkspacesService", () => {
  it("returns an empty list when the user owns no workspaces", async () => {
    const { uow } = makeUow([]);
    const svc = new ListBlockingOwnedWorkspacesService(uow as never);
    const out = await svc.execute(userId);
    expect(out).toEqual({ workspaces: [] });
  });

  it("returns owned workspaces as plain objects", async () => {
    const { uow } = makeUow([
      { id: "ws_01", name: "Acme", slug: "acme" },
      { id: "ws_02", name: "Beta", slug: "beta" },
    ]);
    const svc = new ListBlockingOwnedWorkspacesService(uow as never);
    const out = await svc.execute(userId);
    expect(out.workspaces).toEqual([
      { id: "ws_01", name: "Acme", slug: "acme" },
      { id: "ws_02", name: "Beta", slug: "beta" },
    ]);
  });
});
