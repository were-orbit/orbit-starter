import "dotenv/config";
import { createPrismaClient } from "../src/infrastructure/prisma.ts";
import { hashTone } from "../src/identity/domain/user.ts";
import { SystemClock } from "../src/kernel/clock.ts";
import { newId } from "../src/kernel/id.ts";
import {
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
  WORKSPACE_ROLE_SYSTEM_KEYS,
  type WorkspaceRoleSystemKey,
} from "@orbit/shared/permissions";

/**
 * Minimal idempotent seed for the SaaS starter kit: creates (or reuses)
 * a single demo user, a demo workspace with the three system roles, and
 * an owner membership. Enough to log in via magic link locally and
 * click around the Workspace / Members / Roles / Teams / Billing tabs
 * without running the full onboarding flow.
 *
 * Features built on top of the kit (e.g. teams with default members,
 * Stripe plans) should seed themselves from their own scripts rather
 * than extending this one.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to run prisma seed");
  const prisma = createPrismaClient(url);
  const clock = new SystemClock();
  const now = clock.now();

  const email = (process.env.SEED_OWNER_EMAIL ?? "owner@wereorbit.com").trim().toLowerCase();
  const ownerName = process.env.SEED_OWNER_NAME ?? "Demo Owner";
  const workspaceSlug = (process.env.SEED_WORKSPACE_SLUG ?? "demo").toLowerCase();
  const workspaceName = process.env.SEED_WORKSPACE_NAME ?? "Demo";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: newId("user"),
      email,
      name: ownerName,
      emailVerified: true,
      avatarTone: hashTone(email),
      createdAt: now,
      updatedAt: now,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: {},
    create: {
      id: newId("workspace"),
      slug: workspaceSlug,
      name: workspaceName,
      ownerId: user.id,
      createdAt: now,
    },
  });

  for (const [idx, key] of WORKSPACE_ROLE_SYSTEM_KEYS.entries()) {
    const existing = await prisma.workspaceRole.findFirst({
      where: { workspaceId: workspace.id, systemKey: key },
    });
    if (existing) continue;
    const role = await prisma.workspaceRole.create({
      data: {
        id: newId("workspaceRole"),
        workspaceId: workspace.id,
        name: titleCase(key),
        description: null,
        isSystem: true,
        systemKey: key,
        sortOrder: idx,
        createdAt: now,
        updatedAt: now,
      },
    });
    const perms = defaultPermsFor(key);
    if (perms.length > 0) {
      await prisma.workspaceRolePermission.createMany({
        data: perms.map((permission) => ({
          roleId: role.id,
          permission,
        })),
      });
    }
  }

  const ownerRole = await prisma.workspaceRole.findFirstOrThrow({
    where: { workspaceId: workspace.id, systemKey: "OWNER" },
  });
  const existingOwnerMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
  });
  if (!existingOwnerMember) {
    await prisma.workspaceMember.create({
      data: {
        id: newId("workspaceMember"),
        workspaceId: workspace.id,
        userId: user.id,
        roleId: ownerRole.id,
        tone: hashTone(user.id),
        createdAt: now,
      },
    });
  }

  console.log(`seeded workspace ${workspace.slug} for ${email}`);
}

function titleCase(key: WorkspaceRoleSystemKey): string {
  return key.charAt(0) + key.slice(1).toLowerCase();
}

function defaultPermsFor(key: WorkspaceRoleSystemKey): readonly string[] {
  switch (key) {
    case "OWNER":
      return DEFAULT_OWNER_PERMISSIONS;
    case "ADMIN":
      return DEFAULT_ADMIN_PERMISSIONS;
    case "MEMBER":
      return DEFAULT_MEMBER_PERMISSIONS;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
