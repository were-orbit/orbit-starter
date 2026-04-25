import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsLayout,
  DocsP,
} from "@/components/docs-layout";
import { OrmInline, OrmTabs } from "@/components/orm-tabs";

export const meta = {
  title: "Add a bounded context",
  description:
    "End-to-end: from empty folder to a typed HTTP endpoint that writes a new aggregate and broadcasts a realtime event.",
};

export function AddABoundedContextPage() {
  return (
    <DocsLayout
      kicker="03 · Guides"
      title={meta.title}
      description={meta.description}
      path="/docs/guides/add-a-bounded-context"
    >
      <DocsP>
        Walking example: a <strong>Projects</strong> context. Each workspace
        has many projects; creating one enqueues a domain event and
        broadcasts. The same shape works for any noun you want to add —{" "}
        <em>folders</em>, <em>spaces</em>, <em>pipelines</em>.
      </DocsP>

      <DocsH2>1. Lay out the folders</DocsH2>
      <OrmTabs
        prisma={
          <DocsCodeBlock>
            {`apps/api/src/projects/
├── domain/
│   ├── project.ts              # Aggregate + events
│   ├── project-slug.ts         # Value object
│   └── repositories.ts         # Port interface
├── application/
│   └── create-project.service.ts
├── infrastructure/
│   └── prisma-project.repository.ts
└── feature.ts                  # Wiring for composition`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock>
            {`apps/api/src/projects/
├── domain/
│   ├── project.ts              # Aggregate + events
│   ├── project-slug.ts         # Value object
│   └── repositories.ts         # Port interface
├── application/
│   └── create-project.service.ts
├── infrastructure/
│   └── drizzle-project.repository.ts
└── feature.ts                  # Wiring for composition`}
          </DocsCodeBlock>
        }
      />
      <DocsP>
        Every context looks like this. Once you know the pattern, the
        mechanics stop being interesting.
      </DocsP>

      <DocsH2>2. Define the aggregate</DocsH2>
      <DocsCodeBlock caption="apps/api/src/projects/domain/project.ts">
        {`import type { UserId } from "@/identity/domain/user.ts";
import type { Clock } from "@/kernel/clock.ts";
import { DomainEvent } from "@/kernel/events.ts";
import { type Id, newId } from "@/kernel/id.ts";
import type { WorkspaceId } from "@/workspaces/domain/workspace.ts";
import { ProjectSlug } from "./project-slug.ts";

export type ProjectId = Id<"project">;

export class ProjectCreated extends DomainEvent {
  readonly type = "projects.project.created";
  constructor(
    readonly workspaceId: WorkspaceId,
    readonly projectId: ProjectId,
    readonly createdById: UserId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class Project {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: ProjectId,
    public readonly workspaceId: WorkspaceId,
    private _slug: ProjectSlug,
    private _name: string,
    public readonly createdById: UserId,
    public readonly createdAt: Date,
  ) {}

  static create(
    input: { workspaceId: WorkspaceId; slug: ProjectSlug; name: string; createdById: UserId },
    clock: Clock,
  ): Project {
    const id = newId("project");
    const now = clock.now();
    const p = new Project(id, input.workspaceId, input.slug, input.name.trim(), input.createdById, now);
    p.events.push(new ProjectCreated(input.workspaceId, id, input.createdById, now));
    return p;
  }

  pullEvents(): DomainEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}`}
      </DocsCodeBlock>
      <DocsCallout>
        Register the new brand with the id system — open{" "}
        <DocsCode>apps/api/src/kernel/id.ts</DocsCode> and add{" "}
        <DocsCode>"project"</DocsCode> to the <DocsCode>IdPrefixes</DocsCode>{" "}
        map. That's what makes <DocsCode>newId("project")</DocsCode>{" "}
        type-check.
      </DocsCallout>

      <DocsH2>3. Define the repository port</DocsH2>
      <DocsCodeBlock caption="apps/api/src/projects/domain/repositories.ts">
        {`import type { Project, ProjectId } from "./project.ts";
import type { WorkspaceId } from "@/workspaces/domain/workspace.ts";

export interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | null>;
  findByWorkspaceAndSlug(workspaceId: WorkspaceId, slug: string): Promise<Project | null>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Project[]>;
  save(project: Project): Promise<void>;
  delete(id: ProjectId): Promise<void>;
}`}
      </DocsCodeBlock>
      <DocsP>
        Ports are interfaces — no ORM, no SQL, no Hono. Services depend on
        this, not on the adapter.
      </DocsP>

      <DocsH2>4. Schema + migration</DocsH2>
      <OrmTabs
        prisma={
          <>
            <DocsCodeBlock caption="apps/api/prisma/schema.prisma">
              {`model Project {
  id          String   @id
  workspaceId String
  slug        String
  name        String
  createdById String
  createdAt   DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, slug])
  @@index([workspaceId])
}`}
            </DocsCodeBlock>
            <DocsCodeBlock lang="bash">
              npm run prisma:migrate
            </DocsCodeBlock>
            <DocsP>
              Prisma prompts for a migration name; call it{" "}
              <DocsCode>add_projects</DocsCode>. The client regenerates.
            </DocsP>
          </>
        }
        drizzle={
          <>
            <DocsCodeBlock caption="apps/api/src/db/drizzle/schema.ts">
              {`import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { workspaces } from "./schema.ts";

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdById: text("createdById").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("projects_workspaceId_slug_key").on(t.workspaceId, t.slug),
    index("projects_workspaceId_idx").on(t.workspaceId),
  ],
);`}
            </DocsCodeBlock>
            <DocsCodeBlock lang="bash">
              {`npm run drizzle:generate   # emits apps/api/drizzle/migrations/NNNN_xxx.sql
npm run drizzle:migrate    # applies it to DATABASE_URL`}
            </DocsCodeBlock>
            <DocsP>
              <DocsCode>drizzle-kit generate</DocsCode> writes a numbered
              SQL file under <DocsCode>apps/api/drizzle/migrations/</DocsCode>.
              Rename it to something like{" "}
              <DocsCode>0007_add_projects.sql</DocsCode> if you want
              meaningful filenames in git.
            </DocsP>
          </>
        }
      />

      <DocsH2>5. Implement the repository</DocsH2>
      <OrmTabs
        prisma={
          <DocsCodeBlock caption="apps/api/src/projects/infrastructure/prisma-project.repository.ts">
            {`import type { Prisma } from "@/infrastructure/prisma.ts";
import { Project, type ProjectId } from "../domain/project.ts";
import type { ProjectRepository } from "../domain/repositories.ts";
import { ProjectSlug } from "../domain/project-slug.ts";

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly db: Prisma) {}

  async findById(id: ProjectId): Promise<Project | null> {
    const row = await this.db.project.findUnique({ where: { id } });
    return row ? hydrate(row) : null;
  }

  async findByWorkspaceAndSlug(workspaceId, slug) {
    const row = await this.db.project.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    return row ? hydrate(row) : null;
  }

  async listByWorkspace(workspaceId) {
    const rows = await this.db.project.findMany({ where: { workspaceId } });
    return rows.map(hydrate);
  }

  async save(p: Project): Promise<void> {
    await this.db.project.upsert({
      where: { id: p.id },
      update: { name: p.name },
      create: {
        id: p.id,
        workspaceId: p.workspaceId,
        slug: p.slug.value,
        name: p.name,
        createdById: p.createdById,
        createdAt: p.createdAt,
      },
    });
  }

  async delete(id: ProjectId): Promise<void> {
    await this.db.project.delete({ where: { id } }).catch(() => undefined);
  }
}

function hydrate(row: { id: string; /* ... */ }): Project {
  return Project.rehydrate({ /* ... */ });
}`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock caption="apps/api/src/projects/infrastructure/drizzle-project.repository.ts">
            {`import { and, asc, eq } from "drizzle-orm";
import { projects } from "@/db/drizzle/schema.ts";
import type { Drizzle } from "@/infrastructure/drizzle.ts";
import { Project, type ProjectId } from "../domain/project.ts";
import type { ProjectRepository } from "../domain/repositories.ts";
import { ProjectSlug } from "../domain/project-slug.ts";
import type { WorkspaceId } from "@/workspaces/domain/workspace.ts";

export class DrizzleProjectRepository implements ProjectRepository {
  constructor(private readonly db: Drizzle) {}

  async findById(id: ProjectId): Promise<Project | null> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return row ? hydrate(row) : null;
  }

  async findByWorkspaceAndSlug(workspaceId: WorkspaceId, slug: string) {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.slug, slug)))
      .limit(1);
    return row ? hydrate(row) : null;
  }

  async listByWorkspace(workspaceId: WorkspaceId) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(asc(projects.createdAt));
    return rows.map(hydrate);
  }

  async save(p: Project): Promise<void> {
    await this.db
      .insert(projects)
      .values({
        id: p.id,
        workspaceId: p.workspaceId,
        slug: p.slug.value,
        name: p.name,
        createdById: p.createdById,
        createdAt: p.createdAt,
      })
      .onConflictDoUpdate({ target: projects.id, set: { name: p.name } });
  }

  async delete(id: ProjectId): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }
}

function hydrate(row: { id: string; /* ... */ }): Project {
  return Project.rehydrate({ /* ... */ });
}`}
          </DocsCodeBlock>
        }
      />

      <DocsH2>6. Wire the repo into the Unit of Work</DocsH2>
      <DocsP>
        Open <DocsCode>apps/api/src/kernel/uow.ts</DocsCode> and extend{" "}
        <DocsCode>TxContext</DocsCode>:
      </DocsP>
      <DocsCodeBlock>
        {`import type { ProjectRepository } from "@/projects/domain/repositories.ts";

export interface TxContext {
  users: UserRepository;
  workspaces: WorkspaceRepository;
  // ...existing...
  projects: ProjectRepository;         // ← add
  events: TxEventCollector;
}`}
      </DocsCodeBlock>
      <DocsP>
        Then in the active UoW (
        <OrmInline
          prisma={<DocsCode>apps/api/src/infrastructure/prisma-uow.ts</DocsCode>}
          drizzle={<DocsCode>apps/api/src/infrastructure/drizzle-uow.ts</DocsCode>}
        />
        ), extend <DocsCode>buildContext</DocsCode>:
      </DocsP>
      <OrmTabs
        prisma={
          <DocsCodeBlock caption="PrismaUnitOfWork.buildContext()">
            {`import { PrismaProjectRepository } from "@/projects/infrastructure/prisma-project.repository.ts";

protected buildContext(db: Prisma): RepoContext {
  return {
    users: new PrismaUserRepository(db),
    workspaces: new PrismaWorkspaceRepository(db),
    // ...existing...
    projects: new PrismaProjectRepository(db),   // ← add
  };
}`}
          </DocsCodeBlock>
        }
        drizzle={
          <DocsCodeBlock caption="DrizzleUnitOfWork.buildContext()">
            {`import { DrizzleProjectRepository } from "@/projects/infrastructure/drizzle-project.repository.ts";

protected buildContext(db: Drizzle): RepoContext {
  return {
    users: new DrizzleUserRepository(db),
    workspaces: new DrizzleWorkspaceRepository(db),
    // ...existing...
    projects: new DrizzleProjectRepository(db),   // ← add
  };
}`}
          </DocsCodeBlock>
        }
      />
      <DocsCallout>
        One line per new context. The read-only proxy in{" "}
        <DocsCode>BaseUnitOfWork</DocsCode> picks up the new repo
        automatically via <DocsCode>Object.entries</DocsCode>.
      </DocsCallout>

      <DocsH2>7. Write the service</DocsH2>
      <DocsCodeBlock caption="apps/api/src/projects/application/create-project.service.ts">
        {`import type { Clock } from "@/kernel/clock.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { UserId } from "@/identity/domain/user.ts";
import type { WorkspaceId } from "@/workspaces/domain/workspace.ts";
import { ConflictError } from "@/kernel/errors.ts";
import { Project } from "../domain/project.ts";
import { ProjectSlug } from "../domain/project-slug.ts";

interface Command {
  workspaceId: WorkspaceId;
  createdById: UserId;
  slug: string;
  name: string;
}

export class CreateProjectService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: Command): Promise<Project> {
    const slug = ProjectSlug.parse(cmd.slug);

    return this.uow.run(async (tx) => {
      const existing = await tx.projects.findByWorkspaceAndSlug(cmd.workspaceId, slug.value);
      if (existing) throw new ConflictError("project.slug_taken");

      const project = Project.create(
        { workspaceId: cmd.workspaceId, slug, name: cmd.name, createdById: cmd.createdById },
        this.clock,
      );
      await tx.projects.save(project);
      tx.events.addMany(project.pullEvents());
      return project;
    });
  }
}`}
      </DocsCodeBlock>

      <DocsH2>8. Wire into composition</DocsH2>
      <DocsP>
        <DocsCode>composition.ts</DocsCode> constructs the service and hands
        it to the HTTP layer. Add it alongside the other services:
      </DocsP>
      <DocsCodeBlock>
        {`import { CreateProjectService } from "@/projects/application/create-project.service.ts";

const createProject = new CreateProjectService(uow, clock);
// then include createProject in the container that controllers read from
return {
  // ...existing...
  createProject,
};`}
      </DocsCodeBlock>

      <DocsH2>9. Add an HTTP controller</DocsH2>
      <DocsCodeBlock caption="apps/api/src/interfaces/http/controllers/projects.controller.ts">
        {`import { Hono } from "hono";
import { z } from "zod";
import type { HonoEnv } from "../middleware/container.ts";
import { requireSession, requirePermission } from "../middleware/session.ts";
import { resolveWorkspaceMember } from "../middleware/workspace.ts";

const CreateBody = z.object({
  slug: z.string().min(2).max(40),
  name: z.string().min(1).max(80),
});

export const projects = new Hono<HonoEnv>()
  .post("/", async (c) => {
    const { userId } = requireSession(c);
    const { me, workspace } = await resolveWorkspaceMember(c, userId);
    requirePermission(me, "projects.create");

    const body = CreateBody.parse(await c.req.json());
    const container = c.get("container");

    const project = await container.createProject.execute({
      workspaceId: workspace.id,
      createdById: me.userId,
      slug: body.slug,
      name: body.name,
    });

    return c.json({ project: { id: project.id, slug: project.slug.value, name: project.name } }, 201);
  });`}
      </DocsCodeBlock>
      <DocsP>
        Mount the controller in the route tree under{" "}
        <DocsCode>/v1/workspaces/:slug/projects</DocsCode>. The session +
        workspace resolution middleware is the same as every other scoped
        route.
      </DocsP>
      <DocsCallout kind="warn">
        <DocsCode>requirePermission(me, "projects.create")</DocsCode> won't
        compile until you add the permission string — see the{" "}
        <em>Add a permission</em> guide.
      </DocsCallout>

      <DocsH2>10. Broadcast it (optional)</DocsH2>
      <DocsP>
        If you want other tabs on the workspace to see the new project
        immediately, subscribe to <DocsCode>ProjectCreated</DocsCode> in{" "}
        <DocsCode>RealtimeEventPublisher</DocsCode>:
      </DocsP>
      <DocsCodeBlock>
        {`this.bus.subscribe<ProjectCreated>(
  "projects.project.created",
  async (event) => {
    const dto = await this.uow.read(async (tx) => {
      const project = await tx.projects.findById(event.projectId);
      return project ? projectToDTO(project) : null;
    });
    if (!dto) return;
    this.hub.broadcast(channels.workspace(event.workspaceId), {
      type: "project.created",
      project: dto,
    });
  },
);`}
      </DocsCodeBlock>
      <DocsP>
        Add the matching entry to the <DocsCode>ServerEvent</DocsCode> union
        in <DocsCode>@orbit/shared/realtime</DocsCode> and handle it in
        the client's <DocsCode>applyServerEvent</DocsCode> — TypeScript will
        force you to cover both.
      </DocsP>

      <DocsH2>That's the pattern</DocsH2>
      <DocsP>
        Every context you add after this one is the same nine steps in the
        same order. Once you've done it twice, it's a five-minute template
        fill-in. The domain stays pure, the adapters stay swappable, and the
        realtime layer picks up the event by name.
      </DocsP>
    </DocsLayout>
  );
}
