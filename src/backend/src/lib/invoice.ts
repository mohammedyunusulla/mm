import type { PrismaClient } from "@prisma/client";

/**
 * Generates the next invoice number in format AP-YYYYMM-NNN.
 * Accepts the tenant's own PrismaClient (req.db) so it operates
 * on the correct per-tenant database.
 */
export async function nextAdvanceInvoiceNumber(db: PrismaClient, date: Date): Promise<string> {
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

  // Atomic upsert + increment keyed on yearMonth only (no tenantId – this is a per-tenant DB)
  const result = await db.$executeRaw`
    INSERT INTO "InvoiceCounter" ("yearMonth", "counter")
    VALUES (${ym}, 1)
    ON CONFLICT ("yearMonth")
    DO UPDATE SET
      "counter" = "InvoiceCounter"."counter" + 1
  `;
  void result;

  const row = await db.invoiceCounter.findUnique({ where: { yearMonth: ym } });
  const n = row?.counter ?? 1;
  return `AP-${ym}-${String(n).padStart(3, "0")}`;
}

