-- CreateTable
CREATE TABLE "app_audit_entries" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_audit_entries" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT,
    "actorMemberId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_audit_entries_occurredAt_idx" ON "app_audit_entries"("occurredAt");

-- CreateIndex
CREATE INDEX "app_audit_entries_actorUserId_occurredAt_idx" ON "app_audit_entries"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "app_audit_entries_action_occurredAt_idx" ON "app_audit_entries"("action", "occurredAt");

-- CreateIndex
CREATE INDEX "workspace_audit_entries_workspaceId_occurredAt_idx" ON "workspace_audit_entries"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "workspace_audit_entries_workspaceId_teamId_occurredAt_idx" ON "workspace_audit_entries"("workspaceId", "teamId", "occurredAt");

-- CreateIndex
CREATE INDEX "workspace_audit_entries_workspaceId_action_occurredAt_idx" ON "workspace_audit_entries"("workspaceId", "action", "occurredAt");

-- AddForeignKey
ALTER TABLE "app_audit_entries" ADD CONSTRAINT "app_audit_entries_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_audit_entries" ADD CONSTRAINT "workspace_audit_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_audit_entries" ADD CONSTRAINT "workspace_audit_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_audit_entries" ADD CONSTRAINT "workspace_audit_entries_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_audit_entries" ADD CONSTRAINT "workspace_audit_entries_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
