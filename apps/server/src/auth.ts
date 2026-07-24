import { rankForAura } from "@aura-ego/shared";
import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { accessToken, randomToken, refreshToken, sha256, verifyRefresh, type AuthedRequest } from "./security.js";
import { sendRecovery, sendVerification } from "./email.js";
import { durationMs, env } from "./config.js";
import {
  accountExists, createPendingUser, createRecoveryToken, createSessionAndRecordLogin,
  createVerificationToken, deleteUser, findRecoveryToken, findSessionWithUser,
  findUserByEmail, findUserWithLatestVerification, findVerificationToken,
  recordFailedLogin, resetPassword, revokeSessionByHash, revokeSessionById,
  rotateSession, verifyEmailToken, type User
} from "./repositories/auth-repository.js";

export const authRouter = Router();
const strictLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const registerSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  email: z.email().transform(v => v.toLowerCase()),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  confirmPassword: z.string()
}).refine(v => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem" });
const cookie = {
  httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const,
  path: "/auth", maxAge: durationMs(env.JWT_REFRESH_EXPIRES_IN)
};
function asCosmeticsMap(value: unknown): Record<string, string> {
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { return {}; }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(source as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

const publicUser = (user: User) => {
  if (!user.profile) throw new Error("PROFILE_NOT_FOUND");
  return {
    id: user.id, username: user.username, email: user.email, emailVerified: Boolean(user.emailVerifiedAt),
    profile: {
      level: user.profile.level, experience: user.profile.experience, totalAura: user.profile.totalAura,
      mmr: user.profile.mmr, rank: rankForAura(user.profile.totalAura), wins: user.profile.wins,
      losses: user.profile.losses, winStreak: user.profile.winStreak,
      tutorialCompleted: user.profile.tutorialCompleted,
      selectedCosmetics: asCosmeticsMap(user.profile.selectedCosmetics)
    }
  };
};
const requestMeta = (req: AuthedRequest) => ({
  userAgent: req.get("user-agent")?.slice(0, 300),
  ipHash: sha256(`${req.ip}:${env.EMAIL_VERIFICATION_SECRET}`)
});

authRouter.post("/register", strictLimit, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    if (await accountExists(data.email, data.username)) {
      return res.status(409).json({ error: { code: "ACCOUNT_CONFLICT", message: "Não foi possível criar a conta com esses dados." } });
    }
    const raw = randomToken();
    const user = await createPendingUser({
      username: data.username, email: data.email, passwordHash: await bcrypt.hash(data.password, 12),
      verificationTokenHash: sha256(raw),
      verificationExpiresAt: new Date(Date.now() + durationMs(env.EMAIL_VERIFICATION_EXPIRES_IN))
    });
    try {
      await sendVerification(user.email, user.username, raw);
    } catch (error) {
      await deleteUser(user.id);
      throw error;
    }
    res.status(201).json({ message: "Conta criada. Confira seu e-mail para confirmar sua presença." });
  } catch (error) {
    if (isDuplicateEntry(error)) return res.status(409).json({ error: { code: "ACCOUNT_CONFLICT", message: "Não foi possível criar a conta com esses dados." } });
    next(error);
  }
});

authRouter.post("/login", strictLimit, async (req, res, next) => {
  try {
    const data = z.object({ email: z.email().transform(v => v.toLowerCase()), password: z.string().max(200) }).parse(req.body);
    const user = await findUserByEmail(data.email, true);
    const valid = user
      ? await bcrypt.compare(data.password, user.passwordHash)
      : await bcrypt.compare(data.password, "$2b$12$wJc1gJr2xJxYh7nMYxW3Ou0Jb6o.4uXf89aCoU/W9p3BLuCeO8cFe");
    if (!user || !valid || !user.profile) {
      if (user) await recordFailedLogin(user);
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha inválidos." } });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(429).json({ error: { code: "TEMPORARILY_LOCKED", message: "Muitas tentativas. Aguarde alguns minutos." } });
    }
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: { code: "ACCOUNT_UNAVAILABLE", message: "Esta conta não está disponível." } });
    }
    const sessionId = crypto.randomUUID();
    const refresh = refreshToken(user.id, sessionId);
    await createSessionAndRecordLogin({
      id: sessionId, userId: user.id, refreshTokenHash: sha256(refresh),
      expiresAt: new Date(Date.now() + durationMs(env.JWT_REFRESH_EXPIRES_IN)), ...requestMeta(req)
    });
    res.cookie("refresh_token", refresh, cookie).json({ accessToken: accessToken(user.id, sessionId), user: publicUser(user) });
  } catch (error) { next(error); }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const raw = req.cookies.refresh_token;
    const claims = verifyRefresh(raw);
    if (!claims.sid) throw new Error("invalid");
    const session = await findSessionWithUser(claims.sid);
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.profile) throw new Error("invalid");
    if (sha256(raw) !== session.refreshTokenHash) {
      await revokeSessionById(session.id);
      throw new Error("replayed");
    }
    const rotated = refreshToken(session.userId, session.id);
    await rotateSession(session.id, sha256(rotated));
    res.cookie("refresh_token", rotated, cookie).json({
      accessToken: accessToken(session.userId, session.id), user: publicUser(session.user)
    });
  } catch {
    res.clearCookie("refresh_token", cookie).status(401).json({ error: { code: "SESSION_EXPIRED", message: "Sua sessão expirou." } });
  }
});

authRouter.post("/logout", async (req, res) => {
  const raw = req.cookies.refresh_token;
  if (raw) await revokeSessionByHash(sha256(raw));
  res.clearCookie("refresh_token", cookie).status(204).end();
});

authRouter.post("/verify-email", strictLimit, async (req, res) => {
  const { token } = z.object({ token: z.string().min(20).max(200) }).parse(req.body);
  const record = await findVerificationToken(sha256(token));
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({
      error: {
        code: record?.usedAt ? "TOKEN_USED" : record ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        message: "Este link é inválido ou expirou."
      }
    });
  }
  await verifyEmailToken(record);
  res.json({ message: "E-mail verificado. Sua presença foi confirmada." });
});

authRouter.post("/resend-verification", strictLimit, async (req, res) => {
  const { email } = z.object({ email: z.email().transform(v => v.toLowerCase()) }).parse(req.body);
  const user = await findUserWithLatestVerification(email);
  if (user && !user.emailVerifiedAt) {
    const last = user.latestVerification;
    if (!last || Date.now() - last.createdAt.getTime() >= 60_000) {
      const raw = randomToken();
      await createVerificationToken(user.id, sha256(raw), new Date(Date.now() + durationMs(env.EMAIL_VERIFICATION_EXPIRES_IN)));
      await sendVerification(user.email, user.username, raw);
    }
  }
  res.json({ message: "Se a conta existir, um novo link será enviado." });
});

authRouter.post("/forgot-password", strictLimit, async (req, res) => {
  const { email } = z.object({ email: z.email().transform(v => v.toLowerCase()) }).parse(req.body);
  const user = await findUserByEmail(email);
  if (user) {
    const raw = randomToken();
    await createRecoveryToken(user.id, sha256(raw), new Date(Date.now() + 3_600_000));
    await sendRecovery(email, raw);
  }
  res.json({ message: "Se a conta existir, você receberá as instruções." });
});

authRouter.post("/reset-password", strictLimit, async (req, res) => {
  const data = z.object({
    token: z.string().min(20), password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/)
  }).parse(req.body);
  const record = await findRecoveryToken(sha256(data.token));
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ error: { code: "TOKEN_INVALID", message: "Este link é inválido ou expirou." } });
  }
  await resetPassword(record, await bcrypt.hash(data.password, 12));
  res.json({ message: "Senha alterada. Entre novamente." });
});

function isDuplicateEntry(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}
