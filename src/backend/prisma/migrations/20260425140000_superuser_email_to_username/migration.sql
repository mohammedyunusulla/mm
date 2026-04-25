-- Rename SuperUser.email to SuperUser.username
ALTER TABLE "SuperUser" RENAME COLUMN "email" TO "username";

-- Update unique index
DROP INDEX "SuperUser_email_key";
CREATE UNIQUE INDEX "SuperUser_username_key" ON "SuperUser"("username");
