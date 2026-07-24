"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// apps/server/src/index.ts
var import_config7 = require("dotenv/config");
var import_node_http = require("node:http");
var import_socket = require("socket.io");

// apps/server/src/app.ts
var import_express4 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var import_zod5 = require("zod");

// apps/server/src/config.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_zod = require("zod");
import_dotenv.default.config({ quiet: true });
import_dotenv.default.config({ path: import_node_path.default.resolve(process.cwd(), "../../.env"), override: false, quiet: true });
var schema = import_zod.z.object({
  NODE_ENV: import_zod.z.enum(["development", "test", "production"]).default("development"),
  PORT: import_zod.z.coerce.number().int().positive().default(3e3),
  FRONTEND_URL: import_zod.z.url(),
  BACKEND_URL: import_zod.z.url(),
  DATABASE_HOST: import_zod.z.string().min(1),
  DATABASE_PORT: import_zod.z.coerce.number().int().positive().default(3306),
  DATABASE_NAME: import_zod.z.string().min(1),
  DATABASE_USERNAME: import_zod.z.string().min(1),
  DATABASE_PASSWORD: import_zod.z.string().min(1),
  DATABASE_SSL: import_zod.z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  JWT_ACCESS_SECRET: import_zod.z.string().min(32),
  JWT_REFRESH_SECRET: import_zod.z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: import_zod.z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: import_zod.z.string().default("7d"),
  EMAIL_VERIFICATION_SECRET: import_zod.z.string().min(32),
  EMAIL_VERIFICATION_EXPIRES_IN: import_zod.z.string().default("24h"),
  SMTP_HOST: import_zod.z.string().min(1),
  SMTP_PORT: import_zod.z.coerce.number().int().positive(),
  SMTP_SECURE: import_zod.z.enum(["true", "false"]).transform((v) => v === "true"),
  SMTP_USER: import_zod.z.string().min(1),
  SMTP_PASSWORD: import_zod.z.string().min(1),
  SMTP_FROM_NAME: import_zod.z.string().default("Aura & Ego"),
  SMTP_FROM_EMAIL: import_zod.z.email(),
  SOCKET_CORS_ORIGIN: import_zod.z.url(),
  MAX_LATENCY_COMPENSATION_MS: import_zod.z.coerce.number().default(150),
  RECONNECT_WINDOW_MS: import_zod.z.coerce.number().default(15e3)
});
var parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Configura\xE7\xE3o inv\xE1lida. Vari\xE1veis ausentes ou incorretas: ${names}. Consulte .env.example.`);
}
var env = parsed.data;
function durationMs(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error(`Dura\xE7\xE3o inv\xE1lida em vari\xE1vel de ambiente: use 15m, 24h ou 7d.`);
  const units = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 };
  return Number(match[1]) * units[match[2]];
}

// apps/server/src/auth.ts
var import_node_crypto3 = __toESM(require("node:crypto"), 1);
var import_express = require("express");
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_zod2 = require("zod");

// apps/server/src/security.ts
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var sha256 = (value) => import_node_crypto.default.createHash("sha256").update(value).digest("hex");
var randomToken = () => import_node_crypto.default.randomBytes(32).toString("base64url");
var accessToken = (userId, sessionId) => import_jsonwebtoken.default.sign({ sub: userId, sid: sessionId, type: "access" }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
var refreshToken = (userId, sessionId) => import_jsonwebtoken.default.sign({ sub: userId, sid: sessionId, type: "refresh" }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN, jwtid: import_node_crypto.default.randomUUID() });
var verifyAccess = (token) => import_jsonwebtoken.default.verify(token, env.JWT_ACCESS_SECRET);
var verifyRefresh = (token) => import_jsonwebtoken.default.verify(token, env.JWT_REFRESH_SECRET);
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new Error("missing");
    const claims = verifyAccess(header.slice(7));
    if (claims.type !== "access") throw new Error("type");
    req.auth = claims;
    next();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sua sess\xE3o expirou. Entre novamente." } });
  }
}

// apps/server/src/email.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
var transport = import_nodemailer.default.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } });
var shell = (title, body, button, href) => `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#191611;color:#f8f2e6;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px"><table width="560" style="max-width:100%;background:#262018;border:1px solid #514633;border-radius:24px"><tr><td style="padding:36px"><div style="color:#f6b73c;font-size:13px;letter-spacing:3px;font-weight:bold">AURA &amp; EGO</div><h1 style="font-size:30px;margin:18px 0">${title}</h1><p style="color:#cfc4b3;line-height:1.6">${body}</p><a href="${href}" style="display:inline-block;background:#f6b73c;color:#191611;text-decoration:none;font-weight:bold;border-radius:999px;padding:14px 24px;margin-top:14px">${button}</a><p style="font-size:12px;color:#8f8577;margin-top:30px">Se voc\xEA n\xE3o solicitou isto, ignore esta mensagem.</p></td></tr></table></td></tr></table></body></html>`;
async function sendVerification(email, username, token) {
  const href = `${env.FRONTEND_URL}/verificar-email?token=${encodeURIComponent(token)}`;
  await transport.sendMail({ from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`, to: email, subject: "Confirme sua presen\xE7a \u2014 Aura & Ego", html: shell("Sua aura chegou.", `Ol\xE1, ${username}. Confirme seu e-mail para liberar treino, ranking e partidas 1v1. O link expira em 24 horas.`, "Verificar e-mail", href) });
}
async function sendRecovery(email, token) {
  const href = `${env.FRONTEND_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await transport.sendMail({ from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`, to: email, subject: "Redefini\xE7\xE3o de senha \u2014 Aura & Ego", html: shell("Recupere sua conta.", "Use o bot\xE3o abaixo para definir uma nova senha. O link \xE9 \xFAnico e expira em uma hora.", "Redefinir senha", href) });
}

// apps/server/src/repositories/auth-repository.ts
var import_node_crypto2 = __toESM(require("node:crypto"), 1);

// apps/server/src/db.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var pool = import_promise.default.createPool({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 6e4,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
  ssl: env.DATABASE_SSL ? {} : void 0
});
async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
async function checkDatabase() {
  await pool.query("SELECT 1");
}

// apps/server/src/repositories/auth-repository.ts
var USER_PROFILE_SELECT = `
  SELECT u.id, u.username, u.email, u.password_hash AS passwordHash,
    u.email_verified_at AS emailVerifiedAt, u.status,
    u.failed_login_attempts AS failedLoginAttempts, u.locked_until AS lockedUntil,
    p.level, p.experience, p.total_aura AS totalAura, p.current_rank AS currentRank,
    p.mmr, p.wins, p.losses, p.win_streak AS winStreak,
    p.tutorial_completed AS tutorialCompleted, p.selected_cosmetics AS selectedCosmetics,
    p.audio_settings AS audioSettings, p.graphics_settings AS graphicsSettings
  FROM users u LEFT JOIN player_profiles p ON p.user_id = u.id`;
function mapUser(row) {
  const profile = row.level === null ? void 0 : {
    userId: row.id,
    level: row.level,
    experience: row.experience,
    totalAura: Number(row.totalAura),
    currentRank: row.currentRank,
    mmr: row.mmr,
    wins: row.wins,
    losses: row.losses,
    winStreak: row.winStreak,
    tutorialCompleted: Boolean(row.tutorialCompleted),
    selectedCosmetics: row.selectedCosmetics,
    audioSettings: row.audioSettings,
    graphicsSettings: row.graphicsSettings
  };
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.passwordHash,
    emailVerifiedAt: row.emailVerifiedAt,
    status: row.status,
    failedLoginAttempts: row.failedLoginAttempts,
    lockedUntil: row.lockedUntil,
    profile
  };
}
async function accountExists(email, username) {
  const [rows] = await pool.query("SELECT 1 FROM users WHERE email = ? OR username = ? LIMIT 1", [email, username]);
  return rows.length > 0;
}
async function createPendingUser(input) {
  return transaction(async (connection) => {
    const userId = import_node_crypto2.default.randomUUID(), tokenId = import_node_crypto2.default.randomUUID();
    await connection.execute(
      "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      [userId, input.username, input.email, input.passwordHash]
    );
    await connection.execute(
      `INSERT INTO player_profiles
        (user_id, selected_cosmetics, audio_settings, graphics_settings)
       VALUES (?, JSON_OBJECT(), ?, ?)`,
      [userId, JSON.stringify({ master: 0.8, music: 0.6, effects: 0.8, muted: false }), JSON.stringify({ quality: "AUTO", reducedMotion: false, cameraShake: true })]
    );
    await connection.execute(
      "INSERT INTO verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [tokenId, userId, input.verificationTokenHash, input.verificationExpiresAt]
    );
    return {
      id: userId,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerifiedAt: null,
      status: "ACTIVE",
      failedLoginAttempts: 0,
      lockedUntil: null
    };
  });
}
async function deleteUser(id) {
  await pool.execute("DELETE FROM users WHERE id = ?", [id]);
}
async function findUserByEmail(email, withProfile = false) {
  const sql = withProfile ? `${USER_PROFILE_SELECT} WHERE u.email = ? LIMIT 1` : `SELECT id, username, email, password_hash AS passwordHash, email_verified_at AS emailVerifiedAt,
      status, failed_login_attempts AS failedLoginAttempts, locked_until AS lockedUntil
     FROM users WHERE email = ? LIMIT 1`;
  const [rows] = await pool.query(sql, [email]);
  return rows[0] ? mapUser(rows[0]) : null;
}
async function findUserById(id, withProfile = false) {
  const sql = withProfile ? `${USER_PROFILE_SELECT} WHERE u.id = ? LIMIT 1` : `SELECT id, username, email, password_hash AS passwordHash, email_verified_at AS emailVerifiedAt,
      status, failed_login_attempts AS failedLoginAttempts, locked_until AS lockedUntil
     FROM users WHERE id = ? LIMIT 1`;
  const [rows] = await pool.query(sql, [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}
async function recordFailedLogin(user) {
  const attempts = user.failedLoginAttempts + 1;
  await pool.execute(
    "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
    [attempts, attempts >= 5 ? new Date(Date.now() + 15 * 6e4) : user.lockedUntil, user.id]
  );
}
async function createSessionAndRecordLogin(input) {
  await transaction(async (connection) => {
    await connection.execute(
      `INSERT INTO sessions
        (id, user_id, refresh_token_hash, user_agent, ip_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.id, input.userId, input.refreshTokenHash, input.userAgent ?? null, input.ipHash, input.expiresAt]
    );
    await connection.execute(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [input.userId]
    );
  });
}
async function findSessionWithUser(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.password_hash AS passwordHash,
      u.email_verified_at AS emailVerifiedAt, u.status,
      u.failed_login_attempts AS failedLoginAttempts, u.locked_until AS lockedUntil,
      p.level, p.experience, p.total_aura AS totalAura, p.current_rank AS currentRank,
      p.mmr, p.wins, p.losses, p.win_streak AS winStreak,
      p.tutorial_completed AS tutorialCompleted, p.selected_cosmetics AS selectedCosmetics,
      p.audio_settings AS audioSettings, p.graphics_settings AS graphicsSettings,
      s.id AS sessionId, s.user_id AS sessionUserId,
      s.refresh_token_hash AS refreshTokenHash, s.expires_at AS expiresAt,
      s.revoked_at AS revokedAt
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN player_profiles p ON p.user_id = u.id
     WHERE s.id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? { id: row.sessionId, userId: row.sessionUserId, refreshTokenHash: row.refreshTokenHash, expiresAt: row.expiresAt, revokedAt: row.revokedAt, user: mapUser(row) } : null;
}
async function rotateSession(id, refreshTokenHash) {
  await pool.execute("UPDATE sessions SET refresh_token_hash = ? WHERE id = ? AND revoked_at IS NULL", [refreshTokenHash, id]);
}
async function revokeSessionById(id) {
  await pool.execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revoked_at IS NULL", [id]);
}
async function revokeSessionByHash(hash) {
  await pool.execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE refresh_token_hash = ? AND revoked_at IS NULL", [hash]);
}
async function findVerificationToken(hash) {
  const [rows] = await pool.query(
    "SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt FROM verification_tokens WHERE token_hash = ? LIMIT 1",
    [hash]
  );
  return rows[0] ?? null;
}
async function verifyEmailToken(record) {
  await transaction(async (connection) => {
    await connection.execute("UPDATE verification_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL", [record.id]);
    await connection.execute("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [record.userId]);
  });
}
async function findUserWithLatestVerification(email) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const [rows] = await pool.query(
    "SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt FROM verification_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [user.id]
  );
  return { ...user, latestVerification: rows[0] ?? null };
}
async function createVerificationToken(userId, hash, expiresAt) {
  await pool.execute(
    "INSERT INTO verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [import_node_crypto2.default.randomUUID(), userId, hash, expiresAt]
  );
}
async function createRecoveryToken(userId, hash, expiresAt) {
  await pool.execute(
    "INSERT INTO recovery_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [import_node_crypto2.default.randomUUID(), userId, hash, expiresAt]
  );
}
async function findRecoveryToken(hash) {
  const [rows] = await pool.query(
    "SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt FROM recovery_tokens WHERE token_hash = ? LIMIT 1",
    [hash]
  );
  return rows[0] ?? null;
}
async function resetPassword(record, passwordHash) {
  await transaction(async (connection) => {
    await connection.execute("UPDATE recovery_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL", [record.id]);
    await connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, record.userId]);
    await connection.execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL", [record.userId]);
  });
}

// apps/server/src/auth.ts
var authRouter = (0, import_express.Router)();
var strictLimit = (0, import_express_rate_limit.default)({ windowMs: 15 * 6e4, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
var registerSchema = import_zod2.z.object({
  username: import_zod2.z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  email: import_zod2.z.email().transform((v) => v.toLowerCase()),
  password: import_zod2.z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  confirmPassword: import_zod2.z.string()
}).refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As senhas n\xE3o coincidem" });
var cookie = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/auth",
  maxAge: durationMs(env.JWT_REFRESH_EXPIRES_IN)
};
var publicUser = (user) => {
  if (!user.profile) throw new Error("PROFILE_NOT_FOUND");
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    profile: {
      level: user.profile.level,
      experience: user.profile.experience,
      totalAura: user.profile.totalAura,
      mmr: user.profile.mmr,
      rank: user.profile.currentRank,
      wins: user.profile.wins,
      losses: user.profile.losses,
      winStreak: user.profile.winStreak,
      tutorialCompleted: user.profile.tutorialCompleted
    }
  };
};
var requestMeta = (req) => ({
  userAgent: req.get("user-agent")?.slice(0, 300),
  ipHash: sha256(`${req.ip}:${env.EMAIL_VERIFICATION_SECRET}`)
});
authRouter.post("/register", strictLimit, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    if (await accountExists(data.email, data.username)) {
      return res.status(409).json({ error: { code: "ACCOUNT_CONFLICT", message: "N\xE3o foi poss\xEDvel criar a conta com esses dados." } });
    }
    const raw = randomToken();
    const user = await createPendingUser({
      username: data.username,
      email: data.email,
      passwordHash: await import_bcryptjs.default.hash(data.password, 12),
      verificationTokenHash: sha256(raw),
      verificationExpiresAt: new Date(Date.now() + durationMs(env.EMAIL_VERIFICATION_EXPIRES_IN))
    });
    try {
      await sendVerification(user.email, user.username, raw);
    } catch (error) {
      await deleteUser(user.id);
      throw error;
    }
    res.status(201).json({ message: "Conta criada. Confira seu e-mail para confirmar sua presen\xE7a." });
  } catch (error) {
    if (isDuplicateEntry(error)) return res.status(409).json({ error: { code: "ACCOUNT_CONFLICT", message: "N\xE3o foi poss\xEDvel criar a conta com esses dados." } });
    next(error);
  }
});
authRouter.post("/login", strictLimit, async (req, res, next) => {
  try {
    const data = import_zod2.z.object({ email: import_zod2.z.email().transform((v) => v.toLowerCase()), password: import_zod2.z.string().max(200) }).parse(req.body);
    const user = await findUserByEmail(data.email, true);
    const valid = user ? await import_bcryptjs.default.compare(data.password, user.passwordHash) : await import_bcryptjs.default.compare(data.password, "$2b$12$wJc1gJr2xJxYh7nMYxW3Ou0Jb6o.4uXf89aCoU/W9p3BLuCeO8cFe");
    if (!user || !valid || !user.profile) {
      if (user) await recordFailedLogin(user);
      return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha inv\xE1lidos." } });
    }
    if (user.lockedUntil && user.lockedUntil > /* @__PURE__ */ new Date()) {
      return res.status(429).json({ error: { code: "TEMPORARILY_LOCKED", message: "Muitas tentativas. Aguarde alguns minutos." } });
    }
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: { code: "ACCOUNT_UNAVAILABLE", message: "Esta conta n\xE3o est\xE1 dispon\xEDvel." } });
    }
    const sessionId = import_node_crypto3.default.randomUUID();
    const refresh = refreshToken(user.id, sessionId);
    await createSessionAndRecordLogin({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: sha256(refresh),
      expiresAt: new Date(Date.now() + durationMs(env.JWT_REFRESH_EXPIRES_IN)),
      ...requestMeta(req)
    });
    res.cookie("refresh_token", refresh, cookie).json({ accessToken: accessToken(user.id, sessionId), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});
authRouter.post("/refresh", async (req, res) => {
  try {
    const raw = req.cookies.refresh_token;
    const claims = verifyRefresh(raw);
    if (!claims.sid) throw new Error("invalid");
    const session = await findSessionWithUser(claims.sid);
    if (!session || session.revokedAt || session.expiresAt < /* @__PURE__ */ new Date() || !session.user.profile) throw new Error("invalid");
    if (sha256(raw) !== session.refreshTokenHash) {
      await revokeSessionById(session.id);
      throw new Error("replayed");
    }
    const rotated = refreshToken(session.userId, session.id);
    await rotateSession(session.id, sha256(rotated));
    res.cookie("refresh_token", rotated, cookie).json({
      accessToken: accessToken(session.userId, session.id),
      user: publicUser(session.user)
    });
  } catch {
    res.clearCookie("refresh_token", cookie).status(401).json({ error: { code: "SESSION_EXPIRED", message: "Sua sess\xE3o expirou." } });
  }
});
authRouter.post("/logout", async (req, res) => {
  const raw = req.cookies.refresh_token;
  if (raw) await revokeSessionByHash(sha256(raw));
  res.clearCookie("refresh_token", cookie).status(204).end();
});
authRouter.post("/verify-email", strictLimit, async (req, res) => {
  const { token } = import_zod2.z.object({ token: import_zod2.z.string().min(20).max(200) }).parse(req.body);
  const record = await findVerificationToken(sha256(token));
  if (!record || record.usedAt || record.expiresAt < /* @__PURE__ */ new Date()) {
    return res.status(400).json({
      error: {
        code: record?.usedAt ? "TOKEN_USED" : record ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        message: "Este link \xE9 inv\xE1lido ou expirou."
      }
    });
  }
  await verifyEmailToken(record);
  res.json({ message: "E-mail verificado. Sua presen\xE7a foi confirmada." });
});
authRouter.post("/resend-verification", strictLimit, async (req, res) => {
  const { email } = import_zod2.z.object({ email: import_zod2.z.email().transform((v) => v.toLowerCase()) }).parse(req.body);
  const user = await findUserWithLatestVerification(email);
  if (user && !user.emailVerifiedAt) {
    const last = user.latestVerification;
    if (!last || Date.now() - last.createdAt.getTime() >= 6e4) {
      const raw = randomToken();
      await createVerificationToken(user.id, sha256(raw), new Date(Date.now() + durationMs(env.EMAIL_VERIFICATION_EXPIRES_IN)));
      await sendVerification(user.email, user.username, raw);
    }
  }
  res.json({ message: "Se a conta existir, um novo link ser\xE1 enviado." });
});
authRouter.post("/forgot-password", strictLimit, async (req, res) => {
  const { email } = import_zod2.z.object({ email: import_zod2.z.email().transform((v) => v.toLowerCase()) }).parse(req.body);
  const user = await findUserByEmail(email);
  if (user) {
    const raw = randomToken();
    await createRecoveryToken(user.id, sha256(raw), new Date(Date.now() + 36e5));
    await sendRecovery(email, raw);
  }
  res.json({ message: "Se a conta existir, voc\xEA receber\xE1 as instru\xE7\xF5es." });
});
authRouter.post("/reset-password", strictLimit, async (req, res) => {
  const data = import_zod2.z.object({
    token: import_zod2.z.string().min(20),
    password: import_zod2.z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/)
  }).parse(req.body);
  const record = await findRecoveryToken(sha256(data.token));
  if (!record || record.usedAt || record.expiresAt < /* @__PURE__ */ new Date()) {
    return res.status(400).json({ error: { code: "TOKEN_INVALID", message: "Este link \xE9 inv\xE1lido ou expirou." } });
  }
  await resetPassword(record, await import_bcryptjs.default.hash(data.password, 12));
  res.json({ message: "Senha alterada. Entre novamente." });
});
function isDuplicateEntry(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}

// apps/server/src/users.ts
var import_express2 = require("express");
var import_zod3 = require("zod");

// apps/server/src/repositories/user-repository.ts
var getUserProfile = (id) => findUserById(id, true);
async function updateProfile(id, data) {
  const fields = [], values = [];
  if (data.tutorialCompleted !== void 0) {
    fields.push("tutorial_completed = ?");
    values.push(data.tutorialCompleted);
  }
  if (data.selectedCosmetics !== void 0) {
    fields.push("selected_cosmetics = ?");
    values.push(JSON.stringify(data.selectedCosmetics));
  }
  if (data.audioSettings !== void 0) {
    fields.push("audio_settings = ?");
    values.push(JSON.stringify(data.audioSettings));
  }
  if (data.graphicsSettings !== void 0) {
    fields.push("graphics_settings = ?");
    values.push(JSON.stringify(data.graphicsSettings));
  }
  if (fields.length) {
    values.push(id);
    await pool.execute(`UPDATE player_profiles SET ${fields.join(", ")} WHERE user_id = ?`, values);
  }
  return (await findUserById(id, true))?.profile ?? null;
}
async function listUserMatches(userId) {
  const [rows] = await pool.query(
    `SELECT m.id, m.mode, m.status, m.started_at AS startedAt, m.ended_at AS endedAt,
      mp.result, mp.aura, mp.highest_combo AS highestCombo, mp.accuracy
     FROM match_participants mp
     JOIN matches m ON m.id = mp.match_id
     WHERE mp.user_id = ?
     ORDER BY m.ended_at DESC
     LIMIT 20`,
    [userId]
  );
  return rows;
}
async function listRankings() {
  const [rows] = await pool.query(
    `SELECT u.username, p.mmr, p.current_rank AS currentRank, p.wins, p.losses,
      p.total_aura AS totalAura
     FROM player_profiles p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.mmr DESC, p.wins DESC
     LIMIT 100`
  );
  return rows.map((row, index) => ({
    position: index + 1,
    username: row.username,
    mmr: row.mmr,
    rank: row.currentRank,
    wins: row.wins,
    losses: row.losses,
    totalAura: Number(row.totalAura)
  }));
}

// apps/server/src/users.ts
var usersRouter = (0, import_express2.Router)();
usersRouter.use(requireAuth);
usersRouter.get("/me", async (req, res) => {
  const user = await getUserProfile(req.auth.sub);
  if (!user?.profile) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Perfil n\xE3o encontrado." } });
  res.json({ id: user.id, username: user.username, email: user.email, emailVerified: Boolean(user.emailVerifiedAt), profile: user.profile });
});
usersRouter.patch("/me", async (req, res) => {
  const data = import_zod3.z.object({ tutorialCompleted: import_zod3.z.boolean().optional(), selectedCosmetics: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.string()).optional(), audioSettings: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.union([import_zod3.z.string(), import_zod3.z.number(), import_zod3.z.boolean()])).optional(), graphicsSettings: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.union([import_zod3.z.string(), import_zod3.z.number(), import_zod3.z.boolean()])).optional() }).strict().parse(req.body);
  const profile = await updateProfile(req.auth.sub, data);
  res.json(profile);
});
usersRouter.get("/me/matches", async (req, res) => {
  res.json(await listUserMatches(req.auth.sub));
});
usersRouter.get("/rankings", async (_req, res) => {
  res.json(await listRankings());
});

// apps/server/src/training.ts
var import_express3 = require("express");
var import_zod4 = require("zod");
var trainingRouter = (0, import_express3.Router)();
trainingRouter.use(requireAuth);
trainingRouter.post("/start", async (req, res) => {
  const data = import_zod4.z.object({ difficulty: import_zod4.z.enum(["INICIANTE", "NORMAL", "DIFICIL", "INSANO"]) }).parse(req.body);
  const user = await findUserById(req.auth.sub);
  if (!user?.emailVerifiedAt) return res.status(403).json({ error: { code: "EMAIL_NOT_VERIFIED", message: "Verifique seu e-mail para iniciar o treino." } });
  res.status(201).json({ transport: "websocket", event: "training:start", difficulty: data.difficulty });
});

// apps/server/src/app.ts
var app = (0, import_express4.default)();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((0, import_helmet.default)({ contentSecurityPolicy: false }));
app.use((0, import_cors.default)({ origin: env.FRONTEND_URL, credentials: true, methods: ["GET", "POST", "PATCH"] }));
app.use(import_express4.default.json({ limit: "32kb" }));
app.use((0, import_cookie_parser.default)());
app.get("/health", (_req, res) => res.json({ status: "ok", version: "1.0.0" }));
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/training", trainingRouter);
if (env.NODE_ENV === "production") {
  const webDist = import_node_path2.default.resolve(process.cwd(), "public");
  app.use(import_express4.default.static(webDist, { index: false, maxAge: "1y", immutable: true }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) return next();
    res.sendFile(import_node_path2.default.join(webDist, "index.html"));
  });
}
app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Rota n\xE3o encontrada." } }));
var errors = (error, _req, res, _next) => {
  if (error instanceof import_zod5.ZodError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Confira os campos informados.", fields: Object.fromEntries(error.issues.map((i) => [i.path.join("."), i.message])) } });
  console.error("request_failed", { name: error instanceof Error ? error.name : "Unknown", message: error instanceof Error ? error.message : "Unknown" });
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "A partida saiu do ritmo. Tente novamente." } });
};
app.use(errors);

// packages/shared/src/game.ts
var GAME_CONFIG = {
  maxEgo: 100,
  pairMinMs: 30,
  pairMaxMs: 450,
  idealPairMs: 140,
  auraPairsPerPoint: 3,
  egoPairsPerPoint: 5,
  spamWindowMs: 1500,
  spamLimit: 60,
  actionLockMs: 0,
  roundDurationMs: 45e3,
  roundsToWin: 2,
  latencyCapMs: 150
};
var EVENT_TEMPLATES = [
  { kind: "MOMENTO_67", name: "Momento 67", duration: 3200, hitWindow: [650, 2450], perfectWindow: [1200, 1700], risk: 8, reward: 18, penalty: 10, shouldAct: true, animation: "placar-67", sound: "crowd-rise", botRule: "ACT", activation: "baseline" },
  { kind: "OLHARES", name: "Olhares da multid\xE3o", duration: 3e3, hitWindow: [700, 2200], perfectWindow: [1150, 1550], risk: 14, reward: 24, penalty: 16, shouldAct: true, animation: "crowd-focus", sound: "crowd-hush", botRule: "ACT", activation: "ego>20" },
  { kind: "SILENCIO", name: "Sil\xEAncio constrangedor", duration: 2600, hitWindow: [2100, 2500], perfectWindow: [2250, 2430], risk: 18, reward: 20, penalty: 18, shouldAct: false, animation: "freeze", sound: "room-tone", botRule: "WAIT", activation: "baseline" },
  { kind: "EVENTO_FALSO", name: "Isca de aura", duration: 2400, hitWindow: [2e3, 2300], perfectWindow: [2100, 2250], risk: 20, reward: 14, penalty: 20, shouldAct: false, animation: "fake-score", sound: "shoe-squeak", botRule: "WAIT", activation: "round>1" },
  { kind: "RITMO", name: "Disputa de ritmo", duration: 3600, hitWindow: [800, 2800], perfectWindow: [1400, 1900], risk: 10, reward: 22, penalty: 12, shouldAct: true, animation: "clap-wave", sound: "claps", botRule: "ACT", activation: "baseline" },
  { kind: "ROUBO", name: "Roubo de aura", duration: 2800, hitWindow: [900, 2200], perfectWindow: [1450, 1700], risk: 16, reward: 25, penalty: 14, shouldAct: true, animation: "spotlight-swap", sound: "whistle", botRule: "COUNTER", activation: "combo>=2" },
  { kind: "PRESSAO", name: "Press\xE3o m\xE1xima", duration: 2200, hitWindow: [700, 1650], perfectWindow: [1050, 1280], risk: 18, reward: 30, penalty: 16, shouldAct: true, animation: "camera-push", sound: "heartbeat", botRule: "ACT", activation: "late-round" },
  { kind: "AURA_COLETIVA", name: "Aura coletiva", duration: 3800, hitWindow: [1800, 3100], perfectWindow: [2350, 2700], risk: 12, reward: 26, penalty: 10, shouldAct: true, animation: "crowd-wave", sound: "stomp", botRule: "ACT", activation: "baseline" },
  { kind: "QUEBRA_CLIMA", name: "Quebra de clima", duration: 2600, hitWindow: [2200, 2500], perfectWindow: [2320, 2440], risk: 16, reward: 18, penalty: 18, shouldAct: false, animation: "ball-roll", sound: "ball-bounce", botRule: "WAIT", activation: "after-combo" }
];
var createPlayer = (id, username) => ({
  id,
  username,
  aura: 0,
  ego: 0,
  combo: 0,
  multiplier: 1,
  lastInputAt: 0,
  lastSequence: 0,
  pendingSixAt: null,
  inputTimes: [],
  identicalIntervals: 0,
  mistakes: 0,
  perfectActions: 0,
  spamViolations: 0,
  successfulActions: 0,
  totalActions: 0,
  highestCombo: 0,
  egoBrokenUntil: 0
});
var mulberry32 = (seed) => () => {
  let t = seed += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function generateEvents(seed, roundStart, count = 12) {
  const random = mulberry32(seed);
  let cursor = roundStart + 1800;
  return Array.from({ length: count }, (_, id) => {
    const template = EVENT_TEMPLATES[Math.floor(random() * EVENT_TEMPLATES.length)];
    const event = { ...template, id, startsAt: cursor };
    cursor += template.duration + 650 + Math.floor(random() * 850);
    return event;
  });
}
function createGame(seed, players, now) {
  return {
    seed,
    phase: "COUNTDOWN",
    round: 1,
    bestOf: 3,
    roundEndsAt: now + 48e3,
    eventIndex: 0,
    currentEvent: null,
    players: Object.fromEntries(players.map((p) => [p.id, createPlayer(p.id, p.username)])),
    roundWins: Object.fromEntries(players.map((p) => [p.id, 0])),
    winnerId: null,
    version: 1
  };
}
function fail(player, evaluation, reason) {
  player.pendingSixAt = null;
  player.combo = 0;
  player.multiplier = 1;
  player.mistakes++;
  return { accepted: true, evaluation, auraDelta: 0, egoDelta: 0, combo: 0, reason };
}
function applyInput(state, intent, serverNow, _estimatedLatency = 0) {
  const player = state.players[intent.playerId];
  if (!player || state.phase !== "ROUND_ACTIVE") return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player?.combo ?? 0, reason: "STATE" };
  if (!Number.isInteger(intent.sequence) || intent.sequence <= player.lastSequence) return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "SEQUENCE" };
  if (Math.abs(serverNow - intent.clientTimestamp) > 5e3) return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "TIMESTAMP" };
  player.lastSequence = intent.sequence;
  player.inputTimes = [...player.inputTimes.filter((t) => serverNow - t <= GAME_CONFIG.spamWindowMs), serverNow];
  if (player.inputTimes.length > GAME_CONFIG.spamLimit) {
    player.spamViolations++;
    return { accepted: false, evaluation: "FORCADO", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "IMPOSSIBLE_RATE" };
  }
  player.lastInputAt = serverNow;
  if (intent.input === "SIX") {
    if (player.pendingSixAt !== null) return fail(player, "ERROU", "ORDER");
    player.pendingSixAt = serverNow;
    return { accepted: true, evaluation: "SEM_AURA", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "PAIR_PENDING" };
  }
  player.totalActions++;
  if (player.pendingSixAt === null) return fail(player, "ERROU", "ORDER");
  const pairGap = serverNow - player.pendingSixAt;
  player.pendingSixAt = null;
  if (pairGap < GAME_CONFIG.pairMinMs) {
    player.spamViolations++;
    return { accepted: false, evaluation: "FORCADO", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "IMPOSSIBLE_SPEED" };
  }
  if (pairGap > GAME_CONFIG.pairMaxMs) return fail(player, "FORA_DO_RITMO", "PAIR_TIMING");
  const perfect = pairGap <= GAME_CONFIG.idealPairMs;
  player.combo++;
  player.highestCombo = Math.max(player.highestCombo, player.combo);
  player.multiplier = 1;
  player.successfulActions++;
  const auraGain = player.successfulActions % GAME_CONFIG.auraPairsPerPoint === 0 ? 1 : 0;
  const egoStep = player.successfulActions % GAME_CONFIG.egoPairsPerPoint === 0 ? 1 : 0;
  const nextEgo = Math.min(GAME_CONFIG.maxEgo, player.ego + egoStep);
  const egoGain = nextEgo - player.ego;
  player.aura += auraGain;
  player.ego = nextEgo;
  if (perfect) player.perfectActions++;
  const evaluation = player.combo >= 25 ? "AURA_LENDARIA" : player.combo >= 8 ? "AURA_FARM" : perfect ? "SIX_SEVEN_PERFEITO" : "LIMPO";
  return { accepted: true, evaluation, auraDelta: auraGain, egoDelta: egoGain, combo: player.combo, reason: auraGain || egoGain ? void 0 : "FARM_PROGRESS" };
}
function mmrDelta(playerMmr, opponentMmr, score, abandoned = false) {
  const expected = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  return Math.round(32 * (score - expected) - (abandoned ? 8 : 0));
}
var BOT_PROFILES = {
  INICIANTE: { cycle: [620, 820], pairGap: [260, 380], accuracy: 0.68 },
  NORMAL: { cycle: [430, 620], pairGap: [170, 280], accuracy: 0.8 },
  DIFICIL: { cycle: [290, 430], pairGap: [90, 190], accuracy: 0.9 },
  INSANO: { cycle: [190, 300], pairGap: [55, 135], accuracy: 0.96 }
};
function botDecision(event, difficulty, seed) {
  const profile = BOT_PROFILES[difficulty], random = mulberry32(seed + event.id * 67);
  const act = random() < profile.accuracy;
  const delay = profile.cycle[0] + random() * (profile.cycle[1] - profile.cycle[0]);
  const pairGap = profile.pairGap[0] + random() * (profile.pairGap[1] - profile.pairGap[0]);
  return { act, delay: Math.round(delay), pairGap: Math.round(pairGap) };
}

// apps/server/src/repositories/match-repository.ts
var import_node_crypto4 = __toESM(require("node:crypto"), 1);
async function createMatch(mode, seed, participants) {
  const id = import_node_crypto4.default.randomUUID();
  await transaction(async (connection) => {
    await connection.execute("INSERT INTO matches (id, mode, status, seed) VALUES (?, ?, 'LOADING', ?)", [id, mode, seed]);
    for (const participant of participants) {
      await connection.execute(
        "INSERT INTO match_participants (match_id, user_id, mmr_before) VALUES (?, ?, ?)",
        [id, participant.userId, participant.mmrBefore]
      );
    }
  });
  return id;
}
async function markMatchActive(id) {
  await pool.execute(
    "UPDATE matches SET status = 'ACTIVE', started_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND status = 'LOADING'",
    [id]
  );
}
async function getMatchProfiles(userIds) {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT user_id AS userId, level, experience, total_aura AS totalAura,
      current_rank AS currentRank, mmr, wins, losses, win_streak AS winStreak
     FROM player_profiles WHERE user_id IN (${placeholders})`,
    userIds
  );
  return rows.map((row) => ({ ...row, totalAura: Number(row.totalAura) }));
}
async function finishRankedMatch(matchId, winnerId, reason, updates) {
  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE matches SET status = 'FINISHED', ended_at = CURRENT_TIMESTAMP(3), winner_id = ?, finish_reason = ? WHERE id = ? AND status <> 'FINISHED'",
      [winnerId, reason, matchId]
    );
    for (const { player, profile, won, delta, rank } of updates) {
      const experience = profile.experience + (won ? 120 : 60);
      await connection.execute(
        `UPDATE match_participants SET aura = ?, remaining_ego = ?, highest_combo = ?,
          accuracy = ?, perfect_actions = ?, mistakes = ?, spam_violations = ?,
          mmr_after = ?, result = ?
         WHERE match_id = ? AND user_id = ?`,
        [
          player.aura,
          player.ego,
          player.highestCombo,
          player.totalActions ? player.successfulActions / player.totalActions : 0,
          player.perfectActions,
          player.mistakes,
          player.spamViolations,
          profile.mmr + delta,
          won ? "WIN" : "LOSS",
          matchId,
          player.id
        ]
      );
      await connection.execute(
        `UPDATE player_profiles SET mmr = ?, current_rank = ?, total_aura = total_aura + ?,
          experience = ?, level = ?, wins = wins + ?, losses = losses + ?,
          win_streak = ?
         WHERE user_id = ?`,
        [
          profile.mmr + delta,
          rank,
          player.aura,
          experience,
          Math.floor(experience / 500) + 1,
          won ? 1 : 0,
          won ? 0 : 1,
          won ? profile.winStreak + 1 : 0,
          player.id
        ]
      );
    }
  });
}
async function finishTrainingMatch(matchId, winnerId, reason, human) {
  const won = winnerId === human.id;
  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE matches SET status = 'FINISHED', ended_at = CURRENT_TIMESTAMP(3), winner_id = ?, finish_reason = ? WHERE id = ? AND status <> 'FINISHED'",
      [won ? human.id : null, reason, matchId]
    );
    await connection.execute(
      `UPDATE match_participants SET aura = ?, remaining_ego = ?, highest_combo = ?,
        accuracy = ?, perfect_actions = ?, mistakes = ?, spam_violations = ?,
        mmr_after = NULL, result = ?
       WHERE match_id = ? AND user_id = ?`,
      [
        human.aura,
        human.ego,
        human.highestCombo,
        human.totalActions ? human.successfulActions / human.totalActions : 0,
        human.perfectActions,
        human.mistakes,
        human.spamViolations,
        won ? "WIN" : "LOSS",
        matchId,
        human.id
      ]
    );
    await connection.execute(
      "UPDATE player_profiles SET total_aura = total_aura + ?, experience = experience + 35 WHERE user_id = ?",
      [human.aura, human.id]
    );
  });
}

// apps/server/src/realtime.ts
var queue = /* @__PURE__ */ new Map();
var rooms = /* @__PURE__ */ new Map();
var playerRooms = /* @__PURE__ */ new Map();
var socketUsers = /* @__PURE__ */ new Map();
var safeState = (room) => ({
  roomId: room.id,
  serverTime: Date.now(),
  state: room.state,
  connection: "BOA",
  currentEvent: room.state.currentEvent
});
function attachRealtime(io2) {
  io2.use(async (socket, next) => {
    try {
      const claims = verifyAccess(String(socket.handshake.auth.token || ""));
      const user = await findUserById(claims.sub, true);
      if (!user?.profile || user.status !== "ACTIVE") throw new Error("unauthorized");
      const connected = { id: user.id, username: user.username, mmr: user.profile.mmr, verified: Boolean(user.emailVerifiedAt), region: String(socket.handshake.auth.region || "sa-east").slice(0, 24) };
      socketUsers.set(socket.id, connected);
      socket.data.user = connected;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });
  io2.on("connection", (socket) => {
    socket.emit("clock:sync", { serverTime: Date.now() });
    socket.on("ping:measure", (sentAt, ack) => ack({ sentAt, serverTime: Date.now() }));
    socket.on("latency:report", (latency) => {
      if (Number.isFinite(latency)) socket.data.latency = Math.max(0, Math.min(latency, 2e3));
    });
    socket.on("matchmaking:join", () => joinQueue(io2, socket));
    socket.on("matchmaking:leave", () => leaveQueue(socket, true));
    socket.on("training:start", (payload) => void startTraining(io2, socket, payload?.difficulty));
    socket.on("match:ready", () => {
      const room = getRoomFor(socket);
      if (!room) return;
      socket.join(room.id);
      socket.emit("match:state", safeState(room));
    });
    socket.on("match:input", (intent, ack) => handleInput(io2, socket, intent, ack));
    socket.on("match:reconnect", () => reconnect(io2, socket));
    socket.on("match:leave", () => forfeit(io2, socket));
    socket.on("disconnect", () => disconnect(io2, socket));
  });
  const matcher = setInterval(() => findMatches(io2), 1e3);
  io2.engine.on("close", () => clearInterval(matcher));
}
function joinQueue(io2, socket) {
  const user = socketUsers.get(socket.id);
  if (!user.verified) return socket.emit("match:error", { code: "EMAIL_NOT_VERIFIED", message: "Verifique seu e-mail para jogar online." });
  if (queueHasUser(user.id) || playerRooms.has(user.id)) return socket.emit("match:error", { code: "ALREADY_QUEUED", message: "Voc\xEA j\xE1 est\xE1 em uma fila ou partida." });
  queue.set(socket.id, { socketId: socket.id, user, joinedAt: Date.now() });
  socket.emit("matchmaking:status", { status: "SEARCHING", joinedAt: Date.now(), range: 100 });
  findMatches(io2);
}
function leaveQueue(socket, notify) {
  queue.delete(socket.id);
  if (notify) socket.emit("matchmaking:status", { status: "IDLE" });
}
var queueHasUser = (id) => [...queue.values()].some((e) => e.user.id === id);
function findMatches(io2) {
  const entries = [...queue.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  for (const first of entries) {
    if (!queue.has(first.socketId)) continue;
    const waited = (Date.now() - first.joinedAt) / 1e3;
    const range = 100 + Math.floor(waited / 10) * 75;
    const second = entries.find((e) => e.socketId !== first.socketId && queue.has(e.socketId) && e.user.id !== first.user.id && e.user.region === first.user.region && Math.abs(e.user.mmr - first.user.mmr) <= range);
    if (!second) {
      io2.to(first.socketId).emit("matchmaking:status", { status: "SEARCHING", joinedAt: first.joinedAt, range });
      continue;
    }
    queue.delete(first.socketId);
    queue.delete(second.socketId);
    void createRankedRoom(io2, first, second);
  }
}
async function createRankedRoom(io2, first, second) {
  const seed = Math.floor(Math.random() * 2e9);
  const matchId = await createMatch("RANKED", seed, [{ userId: first.user.id, mmrBefore: first.user.mmr }, { userId: second.user.id, mmrBefore: second.user.mmr }]);
  const room = makeRoom(matchId, "RANKED", seed, [first.user, second.user]);
  room.sockets.set(first.user.id, first.socketId);
  room.sockets.set(second.user.id, second.socketId);
  rooms.set(room.id, room);
  for (const e of [first, second]) {
    playerRooms.set(e.user.id, room.id);
    io2.sockets.sockets.get(e.socketId)?.join(room.id);
  }
  io2.to(room.id).emit("match:found", { roomId: room.id, players: [first.user, second.user].map(({ id, username, mmr }) => ({ id, username, mmr })), seed });
  setTimeout(() => startRoom(io2, room), 2500);
}
async function startTraining(io2, socket, requested) {
  const user = socketUsers.get(socket.id);
  if (playerRooms.has(user.id)) return socket.emit("match:error", { code: "ALREADY_PLAYING", message: "Voc\xEA j\xE1 est\xE1 em uma partida." });
  const difficulty = ["INICIANTE", "NORMAL", "DIFICIL", "INSANO"].includes(requested || "") ? requested : "NORMAL";
  const seed = Math.floor(Math.random() * 2e9);
  const matchId = await createMatch("TRAINING", seed, [{ userId: user.id, mmrBefore: user.mmr }]);
  const room = makeRoom(matchId, "TRAINING", seed, [user, { id: `bot:${matchId}`, username: difficulty === "INSANO" ? "Lenda da Arquibancada" : "Rival do Bairro", mmr: user.mmr, verified: true, region: user.region }]);
  room.difficulty = difficulty;
  room.sockets.set(user.id, socket.id);
  rooms.set(room.id, room);
  playerRooms.set(user.id, room.id);
  socket.join(room.id);
  socket.emit("match:found", { roomId: room.id, players: Object.values(room.state.players).map((p) => ({ id: p.id, username: p.username })), seed, training: true, difficulty });
  setTimeout(() => startRoom(io2, room), 1200);
}
function makeRoom(id, mode, seed, users) {
  const now = Date.now();
  return { id, mode, state: createGame(seed, users, now), events: [], sockets: /* @__PURE__ */ new Map(), eventCursor: 0, timer: setInterval(() => {
  }, 6e4), nextBotActionAt: now, disconnected: /* @__PURE__ */ new Map(), ending: false };
}
function startRoom(io2, room) {
  clearInterval(room.timer);
  const now = Date.now();
  room.state.phase = "ROUND_ACTIVE";
  room.state.roundEndsAt = now + 45e3;
  room.events = generateEvents(room.state.seed + room.state.round, now, 10);
  room.eventCursor = 0;
  room.nextBotActionAt = now + 500;
  void markMatchActive(room.id);
  io2.to(room.id).emit("match:start", { ...safeState(room), countdownEndedAt: now });
  room.timer = setInterval(() => tickRoom(io2, room), 100);
}
function tickRoom(io2, room) {
  const now = Date.now();
  tickBot(io2, room, now);
  const event = room.events[room.eventCursor];
  if (event && now >= event.startsAt && now <= event.startsAt + event.duration) {
    if (room.state.currentEvent?.id !== event.id) {
      room.state.currentEvent = event;
      room.state.version++;
      io2.to(room.id).emit("match:event", { event, serverTime: now });
    }
  } else if (event && now > event.startsAt + event.duration) {
    room.eventCursor++;
    room.state.currentEvent = null;
    room.state.version++;
    io2.to(room.id).emit("match:state", safeState(room));
  }
  if (now >= room.state.roundEndsAt || room.eventCursor >= room.events.length) endRound(io2, room);
}
function tickBot(io2, room, now) {
  if (room.mode !== "TRAINING" || now < room.nextBotActionAt) return;
  const bot = Object.values(room.state.players).find((p) => p.id.startsWith("bot:"));
  const event = room.state.currentEvent || room.events[room.eventCursor] || room.events[0];
  if (!event) return;
  const decision = botDecision(event, room.difficulty, room.state.seed + room.state.round + bot.lastSequence);
  room.nextBotActionAt = now + decision.delay;
  if (!decision.act) return;
  const result = applyInput(room.state, { playerId: bot.id, input: "SIX", clientTimestamp: now, sequence: bot.lastSequence + 1 }, now);
  io2.to(room.id).emit("match:action", { playerId: bot.id, input: "SIX", result, serverTime: now });
  setTimeout(() => {
    if (room.state.phase !== "ROUND_ACTIVE") return;
    const at = Date.now();
    const result2 = applyInput(room.state, { playerId: bot.id, input: "SEVEN", clientTimestamp: at, sequence: bot.lastSequence + 1 }, at);
    io2.to(room.id).emit("match:action", { playerId: bot.id, input: "SEVEN", result: result2, serverTime: at });
    io2.to(room.id).emit("match:state", safeState(room));
  }, decision.pairGap);
}
function handleInput(io2, socket, raw, ack) {
  const room = getRoomFor(socket), user = socketUsers.get(socket.id);
  if (!room || !user) return ack?.({ accepted: false, reason: "ROOM" });
  const latency = Number(socket.data.latency || 0);
  const result = applyInput(room.state, { ...raw, playerId: user.id }, Date.now(), Math.min(latency, env.MAX_LATENCY_COMPENSATION_MS * 2));
  ack?.(result);
  io2.to(room.id).emit("match:action", { playerId: user.id, input: raw.input, result, serverTime: Date.now() });
  io2.to(room.id).emit("match:state", safeState(room));
}
function endRound(io2, room) {
  if (room.state.phase !== "ROUND_ACTIVE") return;
  room.state.phase = "ROUND_ENDING";
  const players = Object.values(room.state.players).sort((a, b) => b.aura - a.aura);
  if (players[0].aura === players[1].aura) {
    const sudden = { ...generateEvents(room.state.seed + 999, Date.now(), 1)[0], name: "Morte s\xFAbita", kind: "PRESSAO", reward: 67, risk: 67, penalty: 30, startsAt: Date.now() + 1e3 };
    room.events = [sudden];
    room.eventCursor = 0;
    room.state.roundEndsAt = sudden.startsAt + sudden.duration;
    room.state.phase = "ROUND_ACTIVE";
    return io2.to(room.id).emit("match:event", { event: sudden, suddenDeath: true, serverTime: Date.now() });
  }
  const roundWinner = players[0];
  room.state.roundWins[roundWinner.id] = (room.state.roundWins[roundWinner.id] || 0) + 1;
  io2.to(room.id).emit("match:round_end", { round: room.state.round, winnerId: roundWinner.id, state: safeState(room) });
  if (room.state.roundWins[roundWinner.id] >= 2) return void finishRoom(io2, room, roundWinner.id, "SCORE");
  room.state.round++;
  room.state.phase = "INTERMISSION";
  for (const player of players) {
    player.aura = 0;
    player.ego = 0;
    player.combo = 0;
    player.pendingSixAt = null;
  }
  setTimeout(() => startRoom(io2, room), 3500);
}
async function finishRoom(io2, room, winnerId, reason) {
  if (room.ending) return;
  room.ending = true;
  clearInterval(room.timer);
  room.state.phase = "FINISHED";
  room.state.winnerId = winnerId;
  const players = Object.values(room.state.players);
  if (room.mode === "RANKED") {
    const [a, b] = players;
    const profiles = await getMatchProfiles([a.id, b.id]);
    const updates = players.map((p, index) => {
      const profile = profiles.find((x) => x.userId === p.id);
      const opponent = profiles.find((x) => x.userId !== p.id);
      const won = p.id === winnerId, delta = mmrDelta(profile.mmr, opponent.mmr, won ? 1 : 0, reason === "ABANDON" && !won);
      return { p, profile, won, delta, opponent: players[1 - index] };
    });
    await finishRankedMatch(room.id, winnerId, reason, updates.map(({ p, profile, won, delta }) => ({
      player: p,
      profile,
      won,
      delta,
      rank: rankFor(profile.mmr + delta)
    })));
    io2.to(room.id).emit("match:end", { winnerId, reason, state: safeState(room), mmrChanges: Object.fromEntries(updates.map((u) => [u.p.id, u.delta])) });
  } else {
    const human = players.find((p) => !p.id.startsWith("bot:"));
    await finishTrainingMatch(room.id, winnerId, reason, human);
    io2.to(room.id).emit("match:end", { winnerId, reason, state: safeState(room) });
  }
  setTimeout(() => cleanupRoom(room), 5e3);
}
function getRoomFor(socket) {
  const user = socketUsers.get(socket.id), id = user ? playerRooms.get(user.id) : void 0;
  return id ? rooms.get(id) : void 0;
}
function disconnect(io2, socket) {
  leaveQueue(socket, false);
  const user = socketUsers.get(socket.id), room = getRoomFor(socket);
  socketUsers.delete(socket.id);
  if (!user || !room || room.state.phase === "FINISHED") return;
  room.disconnected.set(user.id, Date.now());
  io2.to(room.id).emit("match:opponent_disconnected", { playerId: user.id, reconnectUntil: Date.now() + env.RECONNECT_WINDOW_MS });
  setTimeout(() => {
    if (room.disconnected.has(user.id) && !room.ending) {
      const opponent = Object.keys(room.state.players).find((id) => id !== user.id);
      void finishRoom(io2, room, opponent, "ABANDON");
    }
  }, env.RECONNECT_WINDOW_MS);
}
function reconnect(io2, socket) {
  const user = socketUsers.get(socket.id), roomId = user ? playerRooms.get(user.id) : void 0, room = roomId ? rooms.get(roomId) : void 0;
  if (!user || !room || !room.disconnected.has(user.id)) return socket.emit("match:error", { code: "RECONNECT_FAILED", message: "N\xE3o h\xE1 partida para reconectar." });
  room.disconnected.delete(user.id);
  room.sockets.set(user.id, socket.id);
  socket.join(room.id);
  io2.to(room.id).emit("match:reconnect", { playerId: user.id, state: safeState(room) });
}
function forfeit(io2, socket) {
  const user = socketUsers.get(socket.id), room = getRoomFor(socket);
  if (!user || !room) return;
  const opponent = Object.keys(room.state.players).find((id) => id !== user.id);
  void finishRoom(io2, room, opponent, "FORFEIT");
}
function cleanupRoom(room) {
  clearInterval(room.timer);
  rooms.delete(room.id);
  for (const id of Object.keys(room.state.players)) if (!id.startsWith("bot:")) playerRooms.delete(id);
}
function rankFor(mmr) {
  if (mmr >= 1900) return "AURA_LENDARIA";
  if (mmr >= 1750) return "EGO_INABALAVEL";
  if (mmr >= 1600) return "PRESENCA_DOMINANTE";
  if (mmr >= 1450) return "SIX_SEVEN_CERTIFICADO";
  if (mmr >= 1300) return "FARMER_DE_AURA";
  if (mmr >= 1150) return "AURA_QUESTIONAVEL";
  if (mmr >= 950) return "EGO_FRAGIL";
  return "SEM_PRESENCA";
}

// apps/server/src/index.ts
var http = (0, import_node_http.createServer)(app);
var io = new import_socket.Server(http, { cors: { origin: env.SOCKET_CORS_ORIGIN, credentials: true }, transports: ["websocket", "polling"], maxHttpBufferSize: 32e3, pingInterval: 1e4, pingTimeout: 7e3 });
attachRealtime(io);
async function start() {
  try {
    await checkDatabase();
    http.listen(env.PORT, () => console.log(`Aura & Ego server listening on :${env.PORT}`));
  } catch (error) {
    console.error("startup_failed", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown"
    });
    process.exitCode = 1;
  }
}
void start();
var shutdown = async () => {
  io.close();
  http.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
