-- AlterEnum: simplify roles from (ADMIN, OWNER, WRITER) to (ADMIN, MANAGER)
-- Uses rename-and-recreate to work within a single transaction.

-- Step 1: Rename old enum
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Step 2: Create new enum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER');

-- Step 3: Swap the column type, mapping OWNER→ADMIN and WRITER→MANAGER
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE "role"::text
    WHEN 'OWNER' THEN 'ADMIN'::"UserRole"
    WHEN 'WRITER' THEN 'MANAGER'::"UserRole"
    ELSE "role"::text::"UserRole"
  END
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MANAGER';

-- Step 4: Drop old enum
DROP TYPE "UserRole_old";
