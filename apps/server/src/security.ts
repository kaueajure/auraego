import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "./config.js";

export interface Claims { sub: string; sid?: string; type: "access" | "refresh" }
export interface AuthedRequest extends Request { auth?: Claims }
export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export const accessToken = (userId: string, sessionId: string) => jwt.sign({ sub: userId, sid: sessionId, type: "access" }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
export const refreshToken = (userId: string, sessionId: string) => jwt.sign({ sub: userId, sid: sessionId, type: "refresh" }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
export const verifyAccess = (token: string) => jwt.verify(token, env.JWT_ACCESS_SECRET) as Claims;
export const verifyRefresh = (token: string) => jwt.verify(token, env.JWT_REFRESH_SECRET) as Claims;

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new Error("missing");
    const claims = verifyAccess(header.slice(7));
    if (claims.type !== "access") throw new Error("type");
    req.auth = claims; next();
  } catch { res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sua sessão expirou. Entre novamente." } }); }
}
