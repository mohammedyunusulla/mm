-- AlterEnum: replace STAFF with OWNER and WRITER
-- Step 1: Add new values
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'WRITER';

-- Step 2: Migrate existing STAFF users to WRITER
-- (Must commit the ADD VALUE first, so we wrap in separate statements)
-- Note: Postgres requires ADD VALUE to be outside a transaction block,
-- but Prisma runs migrations outside transactions when ALTER TYPE is detected.

UPDATE "User" SET "role" = 'WRITER' WHERE "role" = 'STAFF';

-- Step 3: Rename enum - Postgres doesn't support DROP VALUE directly,
-- so we recreate the enum via a safe rename-and-recreate pattern.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OWNER', 'WRITER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'WRITER';
DROP TYPE "UserRole_old";
