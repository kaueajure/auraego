import type { RowDataPacket } from "mysql2/promise";
import { rankForAura } from "@aura-ego/shared";
import { pool } from "../db.js";
import { findUserById, type Profile, type User } from "./auth-repository.js";

interface MatchRow extends RowDataPacket {
  id: string; mode: "TRAINING" | "RANKED"; status: string; startedAt: Date | null; endedAt: Date | null;
  result: "WIN" | "LOSS" | "DRAW" | null; aura: number; highestCombo: number; accuracy: number;
}
interface RankingRow extends RowDataPacket {
  username: string; mmr: number; currentRank: string; wins: number; losses: number;
  totalAura: number; winStreak: number; level: number;
}

export const getUserProfile = (id: string): Promise<User | null> => findUserById(id, true);

export async function updateProfile(id: string, data: {
  tutorialCompleted?: boolean;
  selectedCosmetics?: Record<string, string>;
  audioSettings?: Record<string, string | number | boolean>;
  graphicsSettings?: Record<string, string | number | boolean>;
}): Promise<Profile | null> {
  const fields: string[] = [], values: Array<string | number | boolean> = [];
  if (data.tutorialCompleted !== undefined) { fields.push("tutorial_completed = ?"); values.push(data.tutorialCompleted); }
  if (data.selectedCosmetics !== undefined) { fields.push("selected_cosmetics = ?"); values.push(JSON.stringify(data.selectedCosmetics)); }
  if (data.audioSettings !== undefined) { fields.push("audio_settings = ?"); values.push(JSON.stringify(data.audioSettings)); }
  if (data.graphicsSettings !== undefined) { fields.push("graphics_settings = ?"); values.push(JSON.stringify(data.graphicsSettings)); }
  if (fields.length) {
    values.push(id);
    await pool.execute(`UPDATE player_profiles SET ${fields.join(", ")} WHERE user_id = ?`, values);
  }
  return (await findUserById(id, true))?.profile ?? null;
}

export async function listUserMatches(userId: string) {
  const [rows] = await pool.query<MatchRow[]>(
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

export async function listRankings() {
  const [rows] = await pool.query<RankingRow[]>(
    `SELECT u.username, p.mmr, p.current_rank AS currentRank, p.wins, p.losses,
      p.total_aura AS totalAura, p.win_streak AS winStreak, p.level
     FROM player_profiles p
     JOIN users u ON u.id = p.user_id
     WHERE u.status = 'ACTIVE'
     ORDER BY p.total_aura DESC, p.wins DESC, p.mmr DESC, u.username ASC`
  );
  return rows.map((row, index) => ({
    position: index + 1,
    username: row.username,
    mmr: row.mmr,
    rank: rankForAura(Number(row.totalAura)),
    wins: row.wins,
    losses: row.losses,
    totalAura: Number(row.totalAura),
    winStreak: row.winStreak,
    level: row.level
  }));
}
