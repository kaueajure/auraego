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

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  profile: {
    level: number; experience: number; totalAura: number; mmr: number;
    rank: Rank; wins: number; losses: number; winStreak: number;
    tutorialCompleted: boolean;
  };
}

export interface ApiError { error: { code: string; message: string; fields?: Record<string, string> } }

export interface MatchSummary {
  id: string; mode: "TRAINING" | "RANKED"; status: string;
  startedAt: string | null; endedAt: string | null;
  result: "WIN" | "LOSS" | "DRAW" | null; opponent?: string;
  aura: number; highestCombo: number; accuracy: number;
}
