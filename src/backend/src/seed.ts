/**
 * Seed script: creates the initial platform superuser in the master DB.
 * Run once after `npm run db:migrate:master`:
 *   npx tsx src/seed.ts
 *
 * Credentials are read from env vars:
 *   SUPER_USERNAME  (default: admin)
 *   SUPER_PASSWORD  (default: changeme123)
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/master-client";

const masterDb = new PrismaClient();

async function main() {
  const username = process.env.SUPER_USERNAME ?? "admin";
  const password = process.env.SUPER_PASSWORD ?? "changeme123";

  const existing = await masterDb.superUser.findUnique({ where: { username } });
  if (existing) {
    console.log(`✅  Superuser "${username}" already exists — skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await masterDb.superUser.create({ data: { username, passwordHash } });

  console.log(`✅  Superuser created: ${username}`);
  console.log(`⚠️   Change the password immediately via the portal!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => masterDb.$disconnect());
