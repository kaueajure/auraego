import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool, transaction } from "../db.js";

export interface Profile {
  userId: string; level: number; experience: number; totalAura: number; currentRank: string;
  mmr: number; wins: number; losses: number; winStreak: number; tutorialCompleted: boolean;
  selectedCosmetics: unknown; audioSettings: unknown; graphicsSettings: unknown;
}
export interface User {
  id: string; username: string; email: string; passwordHash: string; emailVerifiedAt: Date | null;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED"; failedLoginAttempts: number; lockedUntil: Date | null;
  profile?: Profile;
}
interface UserRow extends RowDataPacket {
  id: string; username: string; email: string; passwordHash: string; emailVerifiedAt: Date | null;
  status: User["status"]; failedLoginAttempts: number; lockedUntil: Date | null;
  level: number | null; experience: number | null; totalAura: number | null; currentRank: string | null;
  mmr: number | null; wins: number | null; losses: number | null; winStreak: number | null;
  tutorialCompleted: number | null; selectedCosmetics: unknown; audioSettings: unknown; graphicsSettings: unknown;
}
export interface TokenRecord {
  id: string; userId: string; expiresAt: Date; usedAt: Date | null; createdAt: Date;
}
interface TokenRow extends RowDataPacket, TokenRecord {}
export interface SessionRecord {
  id: string; userId: string; refreshTokenHash: string; expiresAt: Date; revokedAt: Date | null; user: User;
}
interface SessionRow extends UserRow {
  sessionId: string; sessionUserId: string; refreshTokenHash: string; expiresAt: Date; revokedAt: Date | null;
}

const USER_PROFILE_SELECT = `
  SELECT u.id, u.username, u.email, u.password_hash AS passwordHash,
    u.email_verified_at AS emailVerifiedAt, u.status,
    u.failed_login_attempts AS failedLoginAttempts, u.locked_until AS lockedUntil,
    p.level, p.experience, p.total_aura AS totalAura, p.current_rank AS currentRank,
    p.mmr, p.wins, p.losses, p.win_streak AS winStreak,
    p.tutorial_completed AS tutorialCompleted, p.selected_cosmetics AS selectedCosmetics,
    p.audio_settings AS audioSettings, p.graphics_settings AS graphicsSettings
  FROM users u LEFT JOIN player_profiles p ON p.user_id = u.id`;

function mapUser(row: UserRow): User {
  const profile = row.level === null ? undefined : {
    userId: row.id, level: row.level!, experience: row.experience!, totalAura: Number(row.totalAura!),
    currentRank: row.currentRank!, mmr: row.mmr!, wins: row.wins!, losses: row.losses!,
    winStreak: row.winStreak!, tutorialCompleted: Boolean(row.tutorialCompleted),
    selectedCosmetics: row.selectedCosmetics, audioSettings: row.audioSettings, graphicsSettings: row.graphicsSettings
  };
  return {
    id: row.id, username: row.username, email: row.email, passwordHash: row.passwordHash,
    emailVerifiedAt: row.emailVerifiedAt, status: row.status,
    failedLoginAttempts: row.failedLoginAttempts, lockedUntil: row.lockedUntil, profile
  };
}

export async function accountExists(email: string, username: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT 1 FROM users WHERE email = ? OR username = ? LIMIT 1", [email, username]);
  return rows.length > 0;
}

export async function createPendingUser(input: {
  username: string; email: string; passwordHash: string; verificationTokenHash: string; verificationExpiresAt: Date;
}): Promise<User> {
  return transaction(async connection => {
    const userId = crypto.randomUUID(), tokenId = crypto.randomUUID();
    await connection.execute(
      "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      [userId, input.username, input.email, input.passwordHash]
    );
    await connection.execute(
      `INSERT INTO player_profiles
        (user_id, selected_cosmetics, audio_settings, graphics_settings)
       VALUES (?, JSON_OBJECT(), ?, ?)`,
      [userId, JSON.stringify({ master: .8, music: .6, effects: .8, muted: false }), JSON.stringify({ quality: "AUTO", reducedMotion: false, cameraShake: true })]
    );
    await connection.execute(
      "INSERT INTO verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [tokenId, userId, input.verificationTokenHash, input.verificationExpiresAt]
    );
    return {
      id: userId, username: input.username, email: input.email, passwordHash: input.passwordHash,
      emailVerifiedAt: null, status: "ACTIVE", failedLoginAttempts: 0, lockedUntil: null
    };
  });
}

export async function deleteUser(id: string) {
  await pool.execute("DELETE FROM users WHERE id = ?", [id]);
}

export async function findUserByEmail(email: string, withProfile = false): Promise<User | null> {
  const sql = withProfile ? `${USER_PROFILE_SELECT} WHERE u.email = ? LIMIT 1` :
    `SELECT id, username, email, password_hash AS passwordHash, email_verified_at AS emailVerifiedAt,
      status, failed_login_attempts AS failedLoginAttempts, locked_until AS lockedUntil
     FROM users WHERE email = ? LIMIT 1`;
  const [rows] = await pool.query<UserRow[]>(sql, [email]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string, withProfile = false): Promise<User | null> {
  const sql = withProfile ? `${USER_PROFILE_SELECT} WHERE u.id = ? LIMIT 1` :
    `SELECT id, username, email, password_hash AS passwordHash, email_verified_at AS emailVerifiedAt,
      status, failed_login_attempts AS failedLoginAttempts, locked_until AS lockedUntil
     FROM users WHERE id = ? LIMIT 1`;
  const [rows] = await pool.query<UserRow[]>(sql, [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function recordFailedLogin(user: User) {
  const attempts = user.failedLoginAttempts + 1;
  await pool.execute(
    "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
    [attempts, attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : user.lockedUntil, user.id]
  );
}

export async function createSessionAndRecordLogin(input: {
  id: string; userId: string; refreshTokenHash: string; userAgent?: string; ipHash: string; expiresAt: Date;
}) {
  await transaction(async connection => {
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

export async function findSessionWithUser(id: string): Promise<SessionRecord | null> {
  const [rows] = await pool.query<SessionRow[]>(
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

export async function rotateSession(id: string, refreshTokenHash: string) {
  await pool.execute("UPDATE sessions SET refresh_token_hash = ? WHERE id = ? AND revoked_at IS NULL", [refreshTokenHash, id]);
}
export async function revokeSessionById(id: string) {
  await pool.execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revoked_at IS NULL", [id]);
}
export async function revokeSessionByHash(hash: string) {
  await pool.execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE refresh_token_hash = ? AND revoked_at IS NULL", [hash]);
}

export async function findVerificationToken(hash: string): Promise<TokenRecord | null> {
  const [rows] = await pool.query<TokenRow[]>(
    "SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt FROM verification_tokens WHERE token_hash = ? LIMIT 1",
    [hash]
  );
  return rows[0] ?? null;
}
export async function verifyEmailToken(record: TokenRecord) {
  await transaction(async connection => {
    await connection.execute("UPDATE verification_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL", [record.id]);
    await connection.execute("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [record.userId]);
  });
}

export async function findUserWithLatestVerification(email: string): Promise<(User & { latestVerification: TokenRecord | null }) | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const [rows] = await pool.query<TokenRow[]>(
    "SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt FROM verification_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [user.id]
  );
  return { ...user, latestVerification: rows[0] ?? null };
}

export async function createVerificationToken(userId: string, hash: string, expiresAt: Date) {
  await pool.execute(
    "INSERT INTO verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), userId, hash, expiresAt]
  );
}
export async function createRecoveryToken(userId: string, hash: string, expiresAt: Date) {
  await pool.execute(
    "INSERT INTO recovery_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [crypto.randomUUID(), userId, hash, expiresAt]
  );
}
export async function findRecoveryToken(hash: string): Promise<TokenRecord | null> {
  const [rows] = await pool.query<TokenRow[]>(
    "SELECT id, user_id AS userId, expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt FROM recovery_tokens WHERE token_hash = ? LIMIT 1",
    [hash]
  );
  return rows[0] ?? null;
}
export async function resetPassword(record: TokenRecord, passwordHash: string) {
  await transaction(async connection => {
    await connection.execute("UPDATE recovery_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL", [record.id]);
    await connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, record.userId]);
    await connection.execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL", [record.userId]);
  });
}

export type DbConnection = PoolConnection;
