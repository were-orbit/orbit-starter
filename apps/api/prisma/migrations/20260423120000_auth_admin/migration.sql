-- Adds columns required by the better-auth `admin` plugin when the
-- `auth-admin` feature is enabled. The CLI generator strips these columns
-- (and this migration folder) when the feature is disabled.

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "role"       TEXT,
  ADD COLUMN "banned"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "banReason"  TEXT,
  ADD COLUMN "banExpires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions"
  ADD COLUMN "impersonatedBy" TEXT;
