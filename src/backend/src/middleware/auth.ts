import type { Request, Response, NextFunction } from "express";
import type { PrismaClient } from "@prisma/client";
import { verifyToken, verifySuperToken, type JwtPayload, type SuperJwtPayload } from "../lib/jwt";
import { masterDb } from "../lib/masterDb";
import { getTenantDb } from "../lib/tenantDb";

// Extend Express Request to carry both user info and tenant DB client
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      superUser?: SuperJwtPayload;
      db?: PrismaClient;          // per-tenant Prisma client — set by authenticate
    }
  }
}

/**
 * Validates the tenant JWT, resolves the tenant's DB URL from the master DB,
 * and attaches req.user + req.db for use in route handlers.
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

    req.user = payload;
    req.db = getTenantDb(tenant.dbUrl);
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token expired or invalid" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

/**
 * Allows ADMIN and OWNER roles — blocks WRITER.
 */
export function requireOwnerOrAbove(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "ADMIN" && req.user?.role !== "OWNER") {
    res.status(403).json({ success: false, error: "Owner or Admin access required" });
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

