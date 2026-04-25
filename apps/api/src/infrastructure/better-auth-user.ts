import type { AppContainer } from "@/composition.ts";

/**
 * ORM-agnostic reads/writes against the better-auth-managed `users`
 * table. The auth aggregate is not part of any domain repository —
 * better-auth owns the schema — so these small helpers bridge the gap
 * without leaking `container.prisma` or `container.drizzle` into HTTP
 * controllers.
 *
 * Each helper branches inside a `+feature:orm-*` fence so exactly one
 * path survives the strip. In the monorepo both branches compile; at
 * runtime the first `return` wins, and the second is dead code.
 */

// +feature:auth-admin

export async function readAppAdminRow(
  container: AppContainer,
  userId: string,
): Promise<{ role: string | null; banned: boolean } | null> {
  // +feature:orm-prisma
  const row = await container.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, banned: true },
  });
  return row ?? null;
  // -feature:orm-prisma
}

export async function promoteToAppAdmin(
  container: AppContainer,
  userId: string,
): Promise<void> {
  const before = await readAppAdminRow(container, userId);
  const previousRole = before?.role ?? null;

  // +feature:orm-prisma
  await container.prisma.user.update({
    where: { id: userId },
    data: { role: "admin" },
  });
  // -feature:orm-prisma

  if (previousRole !== "admin") {
    // Self-promotion: actor and target are the same user. When the
    // better-auth admin plugin's setRole endpoint is wrapped in a
    // separate integration, that path will pass the acting admin's id
    // through here as the `actor`.
  }
}
// -feature:auth-admin

