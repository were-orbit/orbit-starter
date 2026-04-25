import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdatePreferencesService } from "./update-preferences.service.ts";
import { User } from "@/identity/domain/user.ts";
import { Email } from "@/identity/domain/email.ts";
import { FakeClock } from "@/kernel/clock.ts";

function buildUser(clock: FakeClock): User {
  return User.register(
    { email: Email.parse("ada@example.com"), name: "Ada" },
    clock,
  );
}

function makeUow(user: User, clock: FakeClock) {
  const saved: User[] = [];
  const uow = {
    run: async <T,>(fn: (tx: unknown) => Promise<T>) => {
      const tx = {
        users: {
          findById: vi.fn(async () => user),
          save: vi.fn(async (u: User) => {
            saved.push(u);
          }),
        },
        events: { add: vi.fn(), addMany: vi.fn() },
      };
      return fn(tx);
    },
    read: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({} as never),
  };
  void clock;
  return { uow, saved };
}

describe("UpdatePreferencesService", () => {
  let clock: FakeClock;
  beforeEach(() => {
    clock = new FakeClock(new Date(Date.UTC(2026, 3, 24, 12, 0, 0)));
  });

  it("updates both fields and saves", async () => {
    const user = buildUser(clock);
    const { uow, saved } = makeUow(user, clock);
    const svc = new UpdatePreferencesService(uow as never, clock);
    await svc.execute({
      userId: user.id,
      themeMode: "dark",
      themePalette: "indigo",
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]!.themeMode).toBe("dark");
    expect(saved[0]!.themePalette).toBe("indigo");
  });

  it("leaves omitted fields untouched", async () => {
    const user = buildUser(clock);
    user.updatePreferences({ themeMode: "dark", themePalette: "indigo" }, clock);
    const { uow, saved } = makeUow(user, clock);
    const svc = new UpdatePreferencesService(uow as never, clock);
    await svc.execute({ userId: user.id, themeMode: "light" });
    expect(saved[0]!.themeMode).toBe("light");
    expect(saved[0]!.themePalette).toBe("indigo");
  });

  it("passing null clears the field", async () => {
    const user = buildUser(clock);
    user.updatePreferences({ themeMode: "dark", themePalette: "indigo" }, clock);
    const { uow, saved } = makeUow(user, clock);
    const svc = new UpdatePreferencesService(uow as never, clock);
    await svc.execute({
      userId: user.id,
      themeMode: null,
      themePalette: null,
    });
    expect(saved[0]!.themeMode).toBeNull();
    expect(saved[0]!.themePalette).toBeNull();
  });

  it("throws on unknown enum strings", async () => {
    const user = buildUser(clock);
    const { uow } = makeUow(user, clock);
    const svc = new UpdatePreferencesService(uow as never, clock);
    await expect(
      svc.execute({ userId: user.id, themePalette: "neon" as never }),
    ).rejects.toThrow(/unknown theme palette/i);
  });

  it("throws when the user does not exist", async () => {
    const user = buildUser(clock);
    const emptyUow = {
      run: async <T,>(fn: (tx: unknown) => Promise<T>) =>
        fn({
          users: { findById: vi.fn(async () => null), save: vi.fn() },
          events: { add: vi.fn(), addMany: vi.fn() },
        }),
      read: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({} as never),
    };
    const svc = new UpdatePreferencesService(emptyUow as never, clock);
    await expect(
      svc.execute({ userId: user.id, themeMode: "dark" }),
    ).rejects.toThrow(/user not found/i);
  });
});
