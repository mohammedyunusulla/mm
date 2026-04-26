import type { Request, Response, NextFunction } from "express";
import type { PrismaClient } from "@prisma/client";
import { verifyToken, verifySuperToken, type JwtPayload, type SuperJwtPayload } from "../lib/jwt";
import { masterDb } from "../lib/masterDb";
import { getTenantDb } from "../lib/tenantDb";

// Subscription status phases
export type SubscriptionStatus = "ACTIVE" | "GRACE" | "READONLY" | "BLOCKED";

const GRACE_DAYS = 7;
const READONLY_DAYS = 7; // after grace

export function computeSubscriptionStatus(endDate: Date): { status: SubscriptionStatus; daysRemaining: number } {
  const now = new Date();
  const end = new Date(endDate);
  const msPerDay = 86_400_000;
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / msPerDay);

  if (diffDays > 0) {
    return { status: "ACTIVE", daysRemaining: diffDays };
  }

  const daysPastExpiry = Math.abs(diffDays);

  if (daysPastExpiry <= GRACE_DAYS) {
    return { status: "GRACE", daysRemaining: GRACE_DAYS - daysPastExpiry };
  }

  if (daysPastExpiry <= GRACE_DAYS + READONLY_DAYS) {
    return { status: "READONLY", daysRemaining: GRACE_DAYS + READONLY_DAYS - daysPastExpiry };
  }

  return { status: "BLOCKED", daysRemaining: 0 };
}

// Extend Express Request to carry both user info and tenant DB client
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      superUser?: SuperJwtPayload;
      db?: PrismaClient;          // per-tenant Prisma client — set by authenticate
      subscriptionStatus?: SubscriptionStatus;
      subscriptionDaysRemaining?: number;
    }
  }
}

/**
 * Validates the tenant JWT, resolves the tenant's DB URL from the master DB,
 * checks subscription status, and attaches req.user + req.db.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing or invalid token" });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));

    // Resolve tenant DB from master
    const tenant = await masterDb.tenant.findUnique({ where: { id: payload.tenantId } });
    if (!tenant || !tenant.isActive) {
      res.status(401).json({ success: false, error: "Tenant not found or disabled" });
      return;
    }

    // Check subscription status
    const { status, daysRemaining } = computeSubscriptionStatus(tenant.subscriptionEndDate);
    if (status === "BLOCKED") {
      res.status(403).json({
        success: false,
        error: "Subscription expired. Please contact your administrator.",
        code: "SUBSCRIPTION_EXPIRED",
      });
      return;
    }

    req.user = payload;
    req.db = getTenantDb(tenant.dbUrl);
    req.subscriptionStatus = status;
    req.subscriptionDaysRemaining = daysRemaining;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token expired or invalid" });
  }
}

/**
 * Blocks write operations (POST/PUT/PATCH/DELETE) when subscription is in READONLY mode.
 * Must be used AFTER authenticate middleware.
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction): void {
  if (req.subscriptionStatus === "READONLY") {
    res.status(403).json({
      success: false,
      error: "Subscription expired. Your account is in read-only mode. Contact your administrator to renew.",
      code: "SUBSCRIPTION_READONLY",
    });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

/**
 * Validates a superuser JWT — does NOT attach req.db (superuser needs master DB only).
 */
export function authenticateSuperUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing or invalid token" });
    return;
  }
  try {
    const payload = verifySuperToken(header.slice(7));
    if (payload.role !== "SUPERUSER") throw new Error("Not a superuser token");
    req.superUser = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token expired or invalid" });
  }
}

