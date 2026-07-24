export type InputKind = "SIX" | "SEVEN";
export type MatchPhase = "COUNTDOWN" | "ROUND_ACTIVE" | "ROUND_ENDING" | "INTERMISSION" | "FINISHED";
export type Evaluation =
  | "ERROU" | "FORA_DO_RITMO" | "FORCADO" | "SEM_AURA" | "LIMPO"
  | "AURA_FARM" | "SIX_SEVEN_PERFEITO" | "EGO_DESTRUIDO" | "AURA_LENDARIA";
export type EventKind = "MOMENTO_67" | "OLHARES" | "SILENCIO" | "EVENTO_FALSO" | "RITMO" | "ROUBO" | "PRESSAO" | "AURA_COLETIVA" | "QUEBRA_CLIMA";

export interface ArenaEvent {
  id: number; kind: EventKind; name: string; startsAt: number; duration: number;
  hitWindow: [number, number]; perfectWindow: [number, number];
  risk: number; reward: number; penalty: number; shouldAct: boolean;
  animation: string; sound: string; botRule: "ACT" | "WAIT" | "COUNTER";
  activation: string;
}

export interface PlayerState {
  id: string; username: string; lookId: string; cosmetics: Record<string, string>;
  aura: number; ego: number; combo: number;
  multiplier: number; orbClaims: number; lastInputAt: number; lastSequence: number;
  pendingSixAt: number | null; inputTimes: number[]; identicalIntervals: number;
  mistakes: number; perfectActions: number; spamViolations: number; successfulActions: number;
  totalActions: number; highestCombo: number; egoBrokenUntil: number;
}

export interface GameState {
  seed: number; phase: MatchPhase; round: number; bestOf: number; roundEndsAt: number;
  eventIndex: number; currentEvent: ArenaEvent | null; players: Record<string, PlayerState>;
  roundWins: Record<string, number>; winnerId: string | null; version: number;
}

export interface InputIntent { playerId: string; input: InputKind; clientTimestamp: number; sequence: number }
export interface ActionResult { accepted: boolean; evaluation: Evaluation; auraDelta: number; egoDelta: number; combo: number; reason?: string }

export const GAME_CONFIG = {
  maxEgo: 100, pairMinMs: 30, pairMaxMs: 450, idealPairMs: 140,
  auraPairsPerPoint: 3, auraStep: 100, egoPairsPerPoint: 5,
  spamWindowMs: 1500, spamLimit: 60, actionLockMs: 0,
  roundDurationMs: 45_000, roundsToWin: 2, latencyCapMs: 150,
  specialOrbCombo: 50, auraOrbMultiplier: 1.1
} as const;

const EVENT_TEMPLATES: Omit<ArenaEvent, "id" | "startsAt">[] = [
  { kind: "MOMENTO_67", name: "Momento 67", duration: 3200, hitWindow: [650, 2450], perfectWindow: [1200, 1700], risk: 8, reward: 18, penalty: 10, shouldAct: true, animation: "placar-67", sound: "crowd-rise", botRule: "ACT", activation: "baseline" },
  { kind: "OLHARES", name: "Olhares da multidão", duration: 3000, hitWindow: [700, 2200], perfectWindow: [1150, 1550], risk: 14, reward: 24, penalty: 16, shouldAct: true, animation: "crowd-focus", sound: "crowd-hush", botRule: "ACT", activation: "ego>20" },
  { kind: "SILENCIO", name: "Silêncio constrangedor", duration: 2600, hitWindow: [2100, 2500], perfectWindow: [2250, 2430], risk: 18, reward: 20, penalty: 18, shouldAct: false, animation: "freeze", sound: "room-tone", botRule: "WAIT", activation: "baseline" },
  { kind: "EVENTO_FALSO", name: "Isca de aura", duration: 2400, hitWindow: [2000, 2300], perfectWindow: [2100, 2250], risk: 20, reward: 14, penalty: 20, shouldAct: false, animation: "fake-score", sound: "shoe-squeak", botRule: "WAIT", activation: "round>1" },
  { kind: "RITMO", name: "Disputa de ritmo", duration: 3600, hitWindow: [800, 2800], perfectWindow: [1400, 1900], risk: 10, reward: 22, penalty: 12, shouldAct: true, animation: "clap-wave", sound: "claps", botRule: "ACT", activation: "baseline" },
  { kind: "ROUBO", name: "Roubo de aura", duration: 2800, hitWindow: [900, 2200], perfectWindow: [1450, 1700], risk: 16, reward: 25, penalty: 14, shouldAct: true, animation: "spotlight-swap", sound: "whistle", botRule: "COUNTER", activation: "combo>=2" },
  { kind: "PRESSAO", name: "Pressão máxima", duration: 2200, hitWindow: [700, 1650], perfectWindow: [1050, 1280], risk: 18, reward: 30, penalty: 16, shouldAct: true, animation: "camera-push", sound: "heartbeat", botRule: "ACT", activation: "late-round" },
  { kind: "AURA_COLETIVA", name: "Aura coletiva", duration: 3800, hitWindow: [1800, 3100], perfectWindow: [2350, 2700], risk: 12, reward: 26, penalty: 10, shouldAct: true, animation: "crowd-wave", sound: "stomp", botRule: "ACT", activation: "baseline" },
  { kind: "QUEBRA_CLIMA", name: "Quebra de clima", duration: 2600, hitWindow: [2200, 2500], perfectWindow: [2320, 2440], risk: 16, reward: 18, penalty: 18, shouldAct: false, animation: "ball-roll", sound: "ball-bounce", botRule: "WAIT", activation: "after-combo" }
];

export const createPlayer = (
  id: string,
  username: string,
  lookId = "emi",
  cosmetics: Record<string, string> = {}
): PlayerState => ({
  id, username, lookId, cosmetics: { ...cosmetics }, aura: 0, ego: 0, combo: 0, multiplier: 1, orbClaims: 0, lastInputAt: 0,
  lastSequence: 0, pendingSixAt: null, inputTimes: [], identicalIntervals: 0,
  mistakes: 0, perfectActions: 0, spamViolations: 0, successfulActions: 0,
  totalActions: 0, highestCombo: 0, egoBrokenUntil: 0
});

const mulberry32 = (seed: number) => () => {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

export function generateEvents(seed: number, roundStart: number, count = 12): ArenaEvent[] {
  const random = mulberry32(seed);
  let cursor = roundStart + 1800;
  return Array.from({ length: count }, (_, id) => {
    const template = EVENT_TEMPLATES[Math.floor(random() * EVENT_TEMPLATES.length)]!;
    const event = { ...template, id, startsAt: cursor };
    cursor += template.duration + 650 + Math.floor(random() * 850);
    return event;
  });
}

export function createGame(
  seed: number,
  players: Array<{ id: string; username: string; lookId?: string; cosmetics?: Record<string, string> }>,
  now: number
): GameState {
  return {
    seed, phase: "COUNTDOWN", round: 1, bestOf: 3, roundEndsAt: now + 48_000,
    eventIndex: 0, currentEvent: null,
    players: Object.fromEntries(players.map(p => [
      p.id,
      createPlayer(p.id, p.username, p.lookId ?? "emi", p.cosmetics ?? {})
    ])),
    roundWins: Object.fromEntries(players.map(p => [p.id, 0])), winnerId: null, version: 1
  };
}

function fail(player: PlayerState, evaluation: Evaluation, reason: string): ActionResult {
  player.pendingSixAt = null; player.combo = 0; player.orbClaims = 0; player.multiplier = 1; player.mistakes++;
  return { accepted: true, evaluation, auraDelta: 0, egoDelta: 0, combo: 0, reason };
}

export function applyInput(state: GameState, intent: InputIntent, serverNow: number, _estimatedLatency = 0): ActionResult {
  const player = state.players[intent.playerId];
  if (!player || state.phase !== "ROUND_ACTIVE") return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player?.combo ?? 0, reason: "STATE" };
  if (!Number.isInteger(intent.sequence) || intent.sequence <= player.lastSequence) return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "SEQUENCE" };
  if (Math.abs(serverNow - intent.clientTimestamp) > 5000) return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "TIMESTAMP" };
  player.lastSequence = intent.sequence;
  player.inputTimes = [...player.inputTimes.filter(t => serverNow - t <= GAME_CONFIG.spamWindowMs), serverNow];
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
  player.combo++; player.highestCombo = Math.max(player.highestCombo, player.combo);
  player.successfulActions++;
  const baseAura = player.successfulActions % GAME_CONFIG.auraPairsPerPoint === 0
    ? GAME_CONFIG.auraStep
    : 0;
  const auraGain = baseAura ? Math.round(baseAura * player.multiplier) : 0;
  const egoStep = player.successfulActions % GAME_CONFIG.egoPairsPerPoint === 0 ? 1 : 0;
  const nextEgo = Math.min(GAME_CONFIG.maxEgo, player.ego + egoStep);
  const egoGain = nextEgo - player.ego;
  player.aura += auraGain;
  player.ego = nextEgo;
  if (perfect) player.perfectActions++;
  const evaluation: Evaluation = player.combo >= 25 ? "AURA_LENDARIA" : player.combo >= 8 ? "AURA_FARM" : perfect ? "SIX_SEVEN_PERFEITO" : "LIMPO";
  return { accepted: true, evaluation, auraDelta: auraGain, egoDelta: egoGain, combo: player.combo, reason: auraGain || egoGain ? undefined : "FARM_PROGRESS" };
}

/** Coleta a bola GigaChad: cada coleta multiplica o farm de aura por 1.1x. */
export function collectAuraOrb(player: PlayerState): { accepted: boolean; multiplier: number; reason?: string } {
  const available = Math.floor(player.combo / GAME_CONFIG.specialOrbCombo);
  if (player.orbClaims >= available) {
    return { accepted: false, multiplier: player.multiplier, reason: "NO_ORB" };
  }
  player.orbClaims += 1;
  player.multiplier = Number((player.multiplier * GAME_CONFIG.auraOrbMultiplier).toFixed(4));
  return { accepted: true, multiplier: player.multiplier };
}

export function mmrDelta(playerMmr: number, opponentMmr: number, score: 0 | 0.5 | 1, abandoned = false): number {
  const expected = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  return Math.round(32 * (score - expected) - (abandoned ? 8 : 0));
}

export type BotDifficulty = "INICIANTE" | "NORMAL" | "DIFICIL" | "INSANO";
export const BOT_PROFILES = {
  INICIANTE: { cycle: [620, 820], pairGap: [260, 380], accuracy: 0.68 },
  NORMAL: { cycle: [430, 620], pairGap: [170, 280], accuracy: 0.8 },
  DIFICIL: { cycle: [290, 430], pairGap: [90, 190], accuracy: 0.9 },
  INSANO: { cycle: [190, 300], pairGap: [55, 135], accuracy: 0.96 }
} as const;

export function botDecision(event: ArenaEvent, difficulty: BotDifficulty, seed: number): { act: boolean; delay: number; pairGap: number } {
  const profile = BOT_PROFILES[difficulty], random = mulberry32(seed + event.id * 67);
  const act = random() < profile.accuracy;
  const delay = profile.cycle[0] + random() * (profile.cycle[1] - profile.cycle[0]);
  const pairGap = profile.pairGap[0] + random() * (profile.pairGap[1] - profile.pairGap[0]);
  return { act, delay: Math.round(delay), pairGap: Math.round(pairGap) };
}
