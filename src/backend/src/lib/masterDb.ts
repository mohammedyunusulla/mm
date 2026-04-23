import { PrismaClient } from "../../generated/master-client";

// Singleton master DB client (platform-level: tenants + superusers)
// Uses MASTER_DATABASE_URL — a separate Postgres database from any tenant DB.
const globalForMaster = globalThis as unknown as { __masterPrisma?: PrismaClient };

export const masterDb: PrismaClient =
  globalForMaster.__masterPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForMaster.__masterPrisma = masterDb;
}

