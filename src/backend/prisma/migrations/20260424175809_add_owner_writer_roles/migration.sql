-- AlterEnum: replace STAFF with OWNER and WRITER
-- Uses rename-and-recreate to work within a single transaction.

-- Step 1: Rename old enum
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Step 2: Create new enum without STAFF
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OWNER', 'WRITER');

-- Step 3: Swap the column type, mapping STAFF → WRITER
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE "role"::text
    WHEN 'STAFF' THEN 'WRITER'::"UserRole"
    ELSE "role"::text::"UserRole"
  END
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'WRITER';

-- Step 4: Drop old enum
DROP TYPE "UserRole_old";
