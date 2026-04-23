import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export interface JwtPayload {
  userId: string;
  tenantId: string;       // master DB tenant id — used to resolve dbUrl
  role: "ADMIN" | "STAFF";
}

export interface SuperJwtPayload {
  superUserId: string;
  role: "SUPERUSER";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function signSuperToken(payload: SuperJwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function verifySuperToken(token: string): SuperJwtPayload {
  return jwt.verify(token, SECRET) as SuperJwtPayload;
}

