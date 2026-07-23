import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { PlayerState } from "@aura-ego/shared";
import { pool, transaction } from "../db.js";

export interface MatchProfile {
  userId: string; level: number; experience: number; totalAura: number; currentRank: string;
  mmr: number; wins: number; losses: number; winStreak: number;
}
interface ProfileRow extends RowDataPacket, MatchProfile {}

export async function createMatch(mode: "RANKED" | "TRAINING", seed: number, participants: Array<{ userId: string; mmrBefore: number }>): Promise<string> {
  const id = crypto.randomUUID();
  await transaction(async connection => {
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

export async function markMatchActive(id: string) {
  await pool.execute(
    "UPDATE matches SET status = 'ACTIVE', started_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND status = 'LOADING'",
    [id]
  );
}

export async function getMatchProfiles(userIds: string[]): Promise<MatchProfile[]> {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => "?").join(",");
  const [rows] = await pool.query<ProfileRow[]>(
    `SELECT user_id AS userId, level, experience, total_aura AS totalAura,
      current_rank AS currentRank, mmr, wins, losses, win_streak AS winStreak
     FROM player_profiles WHERE user_id IN (${placeholders})`,
    userIds
  );
  return rows.map(row => ({ ...row, totalAura: Number(row.totalAura) }));
}

interface RankedUpdate {
  player: PlayerState; profile: MatchProfile; won: boolean; delta: number; rank: string;
}
export async function finishRankedMatch(matchId: string, winnerId: string, reason: string, updates: RankedUpdate[]) {
  await transaction(async connection => {
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
        [player.aura, player.ego, player.highestCombo,
          player.totalActions ? player.successfulActions / player.totalActions : 0,
          player.perfectActions, player.mistakes, player.spamViolations,
          profile.mmr + delta, won ? "WIN" : "LOSS", matchId, player.id]
      );
      await connection.execute(
        `UPDATE player_profiles SET mmr = ?, current_rank = ?, total_aura = total_aura + ?,
          experience = ?, level = ?, wins = wins + ?, losses = losses + ?,
          win_streak = ?
         WHERE user_id = ?`,
        [profile.mmr + delta, rank, player.aura, experience, Math.floor(experience / 500) + 1,
          won ? 1 : 0, won ? 0 : 1, won ? profile.winStreak + 1 : 0, player.id]
      );
    }
  });
}

export async function finishTrainingMatch(matchId: string, winnerId: string, reason: string, human: PlayerState) {
  const won = winnerId === human.id;
  await transaction(async connection => {
    await connection.execute(
      "UPDATE matches SET status = 'FINISHED', ended_at = CURRENT_TIMESTAMP(3), winner_id = ?, finish_reason = ? WHERE id = ? AND status <> 'FINISHED'",
      [won ? human.id : null, reason, matchId]
    );
    await connection.execute(
      `UPDATE match_participants SET aura = ?, remaining_ego = ?, highest_combo = ?,
        accuracy = ?, perfect_actions = ?, mistakes = ?, spam_violations = ?,
        mmr_after = NULL, result = ?
       WHERE match_id = ? AND user_id = ?`,
      [human.aura, human.ego, human.highestCombo,
        human.totalActions ? human.successfulActions / human.totalActions : 0,
        human.perfectActions, human.mistakes, human.spamViolations,
        won ? "WIN" : "LOSS", matchId, human.id]
    );
    await connection.execute(
      "UPDATE player_profiles SET total_aura = total_aura + ?, experience = experience + 35 WHERE user_id = ?",
      [human.aura, human.id]
    );
  });
}
