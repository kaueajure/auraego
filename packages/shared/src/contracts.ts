export type Rank =
  | "SEM_PRESENCA" | "EGO_FRAGIL" | "AURA_QUESTIONAVEL" | "FARMER_DE_AURA"
  | "SIX_SEVEN_CERTIFICADO" | "PRESENCA_DOMINANTE" | "EGO_INABALAVEL" | "AURA_LENDARIA";

export const RANK_LABELS: Record<Rank, string> = {
  SEM_PRESENCA: "Sem Presença",
  EGO_FRAGIL: "Ego Frágil",
  AURA_QUESTIONAVEL: "Aura Questionável",
  FARMER_DE_AURA: "Farmer de Aura",
  SIX_SEVEN_CERTIFICADO: "Six Seven Certificado",
  PRESENCA_DOMINANTE: "Presença Dominante",
  EGO_INABALAVEL: "Ego Inabalável",
  AURA_LENDARIA: "Aura Lendária"
};

/** Patentes por aura total. Escala ×100 do antigo limiar (aura agora sobe de 100 em 100). */
export const RANK_AURA_THRESHOLDS: ReadonlyArray<{ rank: Rank; minAura: number }> = [
  { rank: "AURA_LENDARIA", minAura: 190_000 },
  { rank: "EGO_INABALAVEL", minAura: 175_000 },
  { rank: "PRESENCA_DOMINANTE", minAura: 160_000 },
  { rank: "SIX_SEVEN_CERTIFICADO", minAura: 145_000 },
  { rank: "FARMER_DE_AURA", minAura: 130_000 },
  { rank: "AURA_QUESTIONAVEL", minAura: 115_000 },
  { rank: "EGO_FRAGIL", minAura: 95_000 },
  { rank: "SEM_PRESENCA", minAura: 0 }
];

export function rankForAura(totalAura: number): Rank {
  const aura = Math.max(0, Math.floor(Number(totalAura) || 0));
  for (const entry of RANK_AURA_THRESHOLDS) {
    if (aura >= entry.minAura) return entry.rank;
  }
  return "SEM_PRESENCA";
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  profile: {
    level: number; experience: number; totalAura: number; mmr: number;
    rank: Rank; wins: number; losses: number; winStreak: number;
    tutorialCompleted: boolean;
    selectedCosmetics: Record<string, string>;
  };
}

export interface ApiError { error: { code: string; message: string; fields?: Record<string, string> } }

export interface MatchSummary {
  id: string; mode: "TRAINING" | "RANKED"; status: string;
  startedAt: string | null; endedAt: string | null;
  result: "WIN" | "LOSS" | "DRAW" | null; opponent?: string;
  aura: number; highestCombo: number; accuracy: number;
}
