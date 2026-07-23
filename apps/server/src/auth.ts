import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db.js";
import { accessToken, randomToken, refreshToken, sha256, verifyRefresh, type AuthedRequest } from "./security.js";
import { sendRecovery, sendVerification } from "./email.js";
import { durationMs, env } from "./config.js";

export const authRouter = Router();
const strictLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const registerSchema = z.object({ username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/), email: z.email().transform(v => v.toLowerCase()), password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/), confirmPassword: z.string() }).refine(v => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem" });
const cookie = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/auth", maxAge: 7 * 86400_000 };
const publicUser = (u: any) => ({ id: u.id, username: u.username, email: u.email, emailVerified: Boolean(u.emailVerifiedAt), profile: { level: u.profile.level, experience: u.profile.experience, totalAura: u.profile.totalAura, mmr: u.profile.mmr, rank: u.profile.currentRank, wins: u.profile.wins, losses: u.profile.losses, winStreak: u.profile.winStreak, tutorialCompleted: u.profile.tutorialCompleted } });
const requestMeta = (req: AuthedRequest) => ({ userAgent: req.get("user-agent")?.slice(0, 300), ipHash: sha256(`${req.ip}:${env.EMAIL_VERIFICATION_SECRET}`) });

authRouter.post("/register", strictLimit, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findFirst({ where: { OR: [{ email: data.email }, { username: { equals: data.username, mode: "insensitive" } }] } });
    if (exists) return res.status(409).json({ error: { code: "ACCOUNT_CONFLICT", message: "Não foi possível criar a conta com esses dados." } });
    const raw = randomToken(), tokenHash = sha256(raw);
    const user = await prisma.user.create({ data: { username: data.username, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), profile: { create: {} }, verificationTokens: { create: { tokenHash, expiresAt: new Date(Date.now() + durationMs(env.EMAIL_VERIFICATION_EXPIRES_IN)) } } } });
    try { await sendVerification(user.email, user.username, raw); }
    catch (error) { await prisma.user.delete({ where: { id: user.id } }); throw error; }
    res.status(201).json({ message: "Conta criada. Confira seu e-mail para confirmar sua presença." });
  } catch (error) { next(error); }
});

authRouter.post("/login", strictLimit, async (req, res, next) => {
  try {
    const data = z.object({ email: z.email().transform(v => v.toLowerCase()), password: z.string().max(200) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email }, include: { profile: true } });
    const valid = user ? await bcrypt.compare(data.password, user.passwordHash) : await bcrypt.compare(data.password, "$2b$12$wJc1gJr2xJxYh7nMYxW3Ou0Jb6o.4uXf89aCoU/W9p3BLuCeO8cFe");
    if (!user || !valid || !user.profile) {
      if (user) await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: { increment: 1 }, lockedUntil: user.failedLoginAttempts >= 4 ? new Date(Date.now() + 15 * 60_000) : undefined } });
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha inválidos." } });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) return res.status(429).json({ error: { code: "TEMPORARILY_LOCKED", message: "Muitas tentativas. Aguarde alguns minutos." } });
    const session = await prisma.session.create({ data: { userId: user.id, refreshTokenHash: "pending", expiresAt: new Date(Date.now() + durationMs(env.JWT_REFRESH_EXPIRES_IN)), ...requestMeta(req) } });
    const refresh = refreshToken(user.id, session.id);
    await prisma.$transaction([prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: sha256(refresh) } }), prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } })]);
    res.cookie("refresh_token", refresh, cookie).json({ accessToken: accessToken(user.id, session.id), user: publicUser(user) });
  } catch (error) { next(error); }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const raw = req.cookies.refresh_token;
    const claims = verifyRefresh(raw);
    const session = await prisma.session.findUnique({ where: { id: claims.sid }, include: { user: { include: { profile: true } } } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.profile) throw new Error("invalid");
    if (sha256(raw) !== session.refreshTokenHash) {
      await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new Error("replayed");
    }
    const rotated = refreshToken(session.userId, session.id);
    await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: sha256(rotated) } });
    res.cookie("refresh_token", rotated, cookie).json({ accessToken: accessToken(session.userId, session.id), user: publicUser(session.user) });
  } catch { res.clearCookie("refresh_token", cookie).status(401).json({ error: { code: "SESSION_EXPIRED", message: "Sua sessão expirou." } }); }
});

authRouter.post("/logout", async (req, res) => {
  const raw = req.cookies.refresh_token;
  if (raw) await prisma.session.updateMany({ where: { refreshTokenHash: sha256(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  res.clearCookie("refresh_token", cookie).status(204).end();
});

authRouter.post("/verify-email", strictLimit, async (req, res) => {
  const { token } = z.object({ token: z.string().min(20).max(200) }).parse(req.body);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: { code: record?.usedAt ? "TOKEN_USED" : record ? "TOKEN_EXPIRED" : "TOKEN_INVALID", message: "Este link é inválido ou expirou." } });
  await prisma.$transaction([prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } })]);
  res.json({ message: "E-mail verificado. Sua presença foi confirmada." });
});

authRouter.post("/resend-verification", strictLimit, async (req, res) => {
  const { email } = z.object({ email: z.email().transform(v => v.toLowerCase()) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { verificationTokens: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (user && !user.emailVerifiedAt) {
    const last = user.verificationTokens[0];
    if (!last || Date.now() - last.createdAt.getTime() >= 60_000) {
      const raw = randomToken();
      await prisma.verificationToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + durationMs(env.EMAIL_VERIFICATION_EXPIRES_IN)) } });
      await sendVerification(user.email, user.username, raw);
    }
  }
  res.json({ message: "Se a conta existir, um novo link será enviado." });
});

authRouter.post("/forgot-password", strictLimit, async (req, res) => {
  const { email } = z.object({ email: z.email().transform(v => v.toLowerCase()) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) { const raw = randomToken(); await prisma.recoveryToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 3600_000) } }); await sendRecovery(email, raw); }
  res.json({ message: "Se a conta existir, você receberá as instruções." });
});

authRouter.post("/reset-password", strictLimit, async (req, res) => {
  const data = z.object({ token: z.string().min(20), password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/) }).parse(req.body);
  const record = await prisma.recoveryToken.findUnique({ where: { tokenHash: sha256(data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: { code: "TOKEN_INVALID", message: "Este link é inválido ou expirou." } });
  await prisma.$transaction([prisma.recoveryToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(data.password, 12) } }), prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
  res.json({ message: "Senha alterada. Entre novamente." });
});
