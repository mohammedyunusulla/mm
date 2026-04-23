import { PrismaClient } from "@prisma/client";

// Cache of dbUrl → PrismaClient so we don't open a new connection on every request
const clientCache = new Map<string, PrismaClient>();

/**
 * Returns a PrismaClient pointed at the given tenant DB URL.
 * Creates and caches a new client on first use.
 */
export function getTenantDb(dbUrl: string): PrismaClient {
  if (clientCache.has(dbUrl)) return clientCache.get(dbUrl)!;

  const client = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  clientCache.set(dbUrl, client);
  return client;
}

/**
 * Gracefully disconnect all cached tenant clients (call on server shutdown).
 */
export async function disconnectAllTenantDbs(): Promise<void> {
  const disconnects = [...clientCache.values()].map((c) => c.$disconnect());
  await Promise.all(disconnects);
  clientCache.clear();
}
