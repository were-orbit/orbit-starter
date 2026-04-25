-- AlterTable
ALTER TABLE "users" ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "users_demoExpiresAt_idx" ON "users"("demoExpiresAt");

-- CreateIndex
CREATE INDEX "workspaces_demoExpiresAt_idx" ON "workspaces"("demoExpiresAt");
