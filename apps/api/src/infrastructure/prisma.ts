import { PrismaPg } from "@prisma/adapter-pg";
import type { IdKind } from "@/kernel/id.ts";
import { newId } from "@/kernel/id.ts";
import { PrismaClient } from "../generated/prisma/client.ts";

const MODEL_TO_ID_KIND: Record<string, IdKind> = {
  User: "user",
  Session: "session",
  Workspace: "workspace",
  WorkspaceMember: "workspaceMember",
  WorkspaceInvite: "workspaceInvite",
  WorkspaceRole: "workspaceRole",
  Team: "team",
  TeamMember: "teamMember",
  TeamRole: "teamRole",
  BillingCustomer: "billingCustomer",
  Subscription: "subscription",
  BillingEvent: "billingEvent",
  WaitlistEntry: "waitlistEntry",
  AppAuditEntry: "appAuditEntry",
  WorkspaceAuditEntry: "workspaceAuditEntry",
};

export type Prisma = ReturnType<typeof createPrismaClient>;

export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  const base = new PrismaClient({ adapter });

  // Build per-model `create`/`createMany` hooks instead of using
  // `$allModels`: Prisma drops `create` from `$allModels` when any
  // model is missing it (SearchDocument has a required `Unsupported`
  // vector column so its client has no `create`). Iterating the map
  // keeps the ID-prefix contract for every model that *does* support
  // create without breaking typecheck for the one that doesn't.
  const perModelHooks: Record<
    string,
    {
      create: (args: { model: string; args: unknown; query: (a: unknown) => Promise<unknown> }) => Promise<unknown>;
      createMany: (args: { model: string; args: unknown; query: (a: unknown) => Promise<unknown> }) => Promise<unknown>;
    }
  > = {};
  for (const [model, kind] of Object.entries(MODEL_TO_ID_KIND)) {
    perModelHooks[model] = {
      async create({ args, query }) {
        const a = args as { data?: { id?: string } };
        if (a.data && !a.data.id) a.data.id = newId(kind);
        return query(a);
      },
      async createMany({ args, query }) {
        const a = args as { data?: unknown };
        if (a.data) {
          const rows = Array.isArray(a.data) ? a.data : [a.data];
          for (const row of rows) {
            const r = row as { id?: string };
            if (!r.id) r.id = newId(kind);
          }
        }
        return query(a);
      },
    };
  }
  const extended = base.$extends({
    name: "prefixed-ids",
    query: perModelHooks as never,
  });

  return extended;
}

let singleton: Prisma | null = null;

export function getPrisma(): Prisma {
  if (!singleton) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    singleton = createPrismaClient(url);
  }
  return singleton;
}
