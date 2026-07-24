import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { ActivityEventType, ActivityLogEntry } from "@aura-ego/shared";
import { pool } from "../db.js";

interface ActivityRow extends RowDataPacket {
  id: string;
  userId: string | null;
  email: string;
  eventType: ActivityEventType;
  metadata: unknown;
  createdAt: Date;
}

function asMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { return null; }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  return source as Record<string, unknown>;
}

export async function insertActivityLog(input: {
  userId: string | null;
  email: string;
  eventType: ActivityEventType;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO activity_logs (id, user_id, email, event_type, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.email.toLowerCase(),
      input.eventType,
      input.metadata == null ? null : JSON.stringify(input.metadata)
    ]
  );
}

/** Fire-and-forget: logging must never block login or match flow. */
export function recordActivity(input: {
  userId: string | null;
  email: string;
  eventType: ActivityEventType;
  metadata?: Record<string, unknown> | null;
}): void {
  void insertActivityLog(input).catch(error => {
    console.error("activity_log_failed", {
      eventType: input.eventType,
      email: input.email,
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown"
    });
  });
}

export async function listActivityLogs(limit = 200): Promise<ActivityLogEntry[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const [rows] = await pool.query<ActivityRow[]>(
    `SELECT id, user_id AS userId, email, event_type AS eventType,
      metadata, created_at AS createdAt
     FROM activity_logs
     ORDER BY created_at DESC
     LIMIT ?`,
    [safeLimit]
  );
  return rows.map(row => ({
    id: row.id,
    userId: row.userId,
    email: row.email,
    eventType: row.eventType,
    metadata: asMetadata(row.metadata),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
  }));
}
