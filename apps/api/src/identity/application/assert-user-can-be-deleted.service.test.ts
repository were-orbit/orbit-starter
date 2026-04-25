import { describe, expect, it, vi } from "vitest";
import {
  AssertUserCanBeDeletedService,
  AccountDeletionBlockedError,
} from "./assert-user-can-be-deleted.service.ts";
import type { UserId } from "@/identity/domain/user.ts";

const userId = "user_01" as UserId;

function makeSvc(rows: Array<{ id: string; name: string; slug: string }>) {
  const list = { execute: vi.fn(async () => ({ workspaces: rows })) };
  return {
    svc: new AssertUserCanBeDeletedService(list as never),
    list,
  };
}

describe("AssertUserCanBeDeletedService", () => {
  it("resolves when the user owns no workspaces", async () => {
    const { svc } = makeSvc([]);
    await expect(svc.execute(userId)).resolves.toBeUndefined();
  });

  it("throws AccountDeletionBlockedError when the user owns workspaces", async () => {
    const { svc } = makeSvc([{ id: "ws_01", name: "Acme", slug: "acme" }]);
    await expect(svc.execute(userId)).rejects.toBeInstanceOf(
      AccountDeletionBlockedError,
    );
  });

  it("attaches the blocking workspace list to the error", async () => {
    const { svc } = makeSvc([
      { id: "ws_01", name: "Acme", slug: "acme" },
      { id: "ws_02", name: "Beta", slug: "beta" },
    ]);
    await expect(svc.execute(userId)).rejects.toBeInstanceOf(
      AccountDeletionBlockedError,
    );
    try {
      await svc.execute(userId);
      throw new Error("expected execute to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AccountDeletionBlockedError);
      expect((err as AccountDeletionBlockedError).blockingWorkspaces).toEqual([
        { id: "ws_01", name: "Acme", slug: "acme" },
        { id: "ws_02", name: "Beta", slug: "beta" },
      ]);
    }
  });

  it("error has code account.delete.sole_owner and status 409", async () => {
    const { svc } = makeSvc([{ id: "ws_01", name: "Acme", slug: "acme" }]);
    try {
      await svc.execute(userId);
      throw new Error("expected execute to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AccountDeletionBlockedError);
      const e = err as AccountDeletionBlockedError;
      expect(e.code).toBe("account.delete.sole_owner");
      expect(e.status).toBe(409);
    }
  });
});
