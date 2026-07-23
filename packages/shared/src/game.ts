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
  id: string; username: string; aura: number; ego: number; combo: number;
  multiplier: number; lastInputAt: number; lastSequence: number;
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
  maxEgo: 100, pairMinMs: 70, pairMaxMs: 650, idealPairMs: 230,
  spamWindowMs: 1500, spamLimit: 8, actionLockMs: 900,
  roundDurationMs: 45_000, roundsToWin: 2, latencyCapMs: 150
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

export const createPlayer = (id: string, username: string): PlayerState => ({
  id, username, aura: 0, ego: 100, combo: 0, multiplier: 1, lastInputAt: 0,
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

export function createGame(seed: number, players: Array<{ id: string; username: string }>, now: number): GameState {
  return {
    seed, phase: "COUNTDOWN", round: 1, bestOf: 3, roundEndsAt: now + 48_000,
    eventIndex: 0, currentEvent: null,
    players: Object.fromEntries(players.map(p => [p.id, createPlayer(p.id, p.username)])),
    roundWins: Object.fromEntries(players.map(p => [p.id, 0])), winnerId: null, version: 1
  };
}

function fail(player: PlayerState, evaluation: Evaluation, egoLoss: number, now: number, reason: string): ActionResult {
  player.ego = Math.max(0, player.ego - egoLoss);
  player.combo = 0; player.multiplier = 1; player.mistakes++;
  if (player.ego === 0) { player.egoBrokenUntil = now + 4000; player.ego = 25; evaluation = "EGO_DESTRUIDO"; }
  return { accepted: true, evaluation, auraDelta: 0, egoDelta: -egoLoss, combo: 0, reason };
}

export function applyInput(state: GameState, intent: InputIntent, serverNow: number, estimatedLatency = 0): ActionResult {
  const player = state.players[intent.playerId];
  if (!player || state.phase !== "ROUND_ACTIVE") return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player?.combo ?? 0, reason: "STATE" };
  if (!Number.isInteger(intent.sequence) || intent.sequence <= player.lastSequence) return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "SEQUENCE" };
  if (Math.abs(serverNow - intent.clientTimestamp) > 5000) return { accepted: false, evaluation: "ERROU", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "TIMESTAMP" };
  player.lastSequence = intent.sequence;
  player.inputTimes = [...player.inputTimes.filter(t => serverNow - t <= GAME_CONFIG.spamWindowMs), serverNow];
  if (player.inputTimes.length > GAME_CONFIG.spamLimit) {
    player.spamViolations++; player.aura = Math.max(0, player.aura - 8);
    return fail(player, "FORCADO", 12, serverNow, "SPAM");
  }
  if (serverNow < player.egoBrokenUntil) return { accepted: false, evaluation: "SEM_AURA", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "EGO_BROKEN" };
  player.lastInputAt = serverNow;
  if (intent.input === "SIX") {
    player.pendingSixAt = serverNow;
    return { accepted: true, evaluation: "SEM_AURA", auraDelta: 0, egoDelta: 0, combo: player.combo, reason: "PAIR_PENDING" };
  }
  player.totalActions++;
  if (player.pendingSixAt === null) return fail(player, "ERROU", 8, serverNow, "ORDER");
  const pairGap = serverNow - player.pendingSixAt;
  player.pendingSixAt = null;
  if (pairGap < GAME_CONFIG.pairMinMs || pairGap > GAME_CONFIG.pairMaxMs) return fail(player, "FORA_DO_RITMO", 7, serverNow, "PAIR_TIMING");
  const event = state.currentEvent;
  if (!event) { player.aura = Math.max(0, player.aura - 5); return fail(player, "FORCADO", 9, serverNow, "NO_EVENT"); }
  const compensatedNow = serverNow - Math.min(Math.max(estimatedLatency / 2, 0), GAME_CONFIG.latencyCapMs);
  const offset = compensatedNow - event.startsAt;
  if (!event.shouldAct && offset < event.hitWindow[0]) { player.aura = Math.max(0, player.aura - event.penalty); return fail(player, "FORCADO", event.penalty, serverNow, "TRAP"); }
  if (offset < event.hitWindow[0] || offset > event.hitWindow[1]) return fail(player, "FORA_DO_RITMO", event.penalty, serverNow, "EVENT_TIMING");
  const perfect = offset >= event.perfectWindow[0] && offset <= event.perfectWindow[1] && Math.abs(pairGap - GAME_CONFIG.idealPairMs) < 100;
  player.combo++; player.highestCombo = Math.max(player.highestCombo, player.combo);
  player.multiplier = Math.min(2.5, 1 + player.combo * 0.15);
  const brokenFactor = serverNow < player.egoBrokenUntil ? 0.5 : 1;
  const gain = Math.round(event.reward * player.multiplier * brokenFactor * (perfect ? 1.5 : 1));
  player.aura += gain; player.successfulActions++;
  if (perfect) player.perfectActions++;
  const evaluation: Evaluation = perfect ? (player.combo >= 6 ? "AURA_LENDARIA" : "SIX_SEVEN_PERFEITO") : player.combo >= 4 ? "AURA_FARM" : "LIMPO";
  return { accepted: true, evaluation, auraDelta: gain, egoDelta: 0, combo: player.combo };
}

export function mmrDelta(playerMmr: number, opponentMmr: number, score: 0 | 0.5 | 1, abandoned = false): number {
  const expected = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  return Math.round(32 * (score - expected) - (abandoned ? 8 : 0));
}

export type BotDifficulty = "INICIANTE" | "NORMAL" | "DIFICIL" | "INSANO";
export const BOT_PROFILES = {
  INICIANTE: { reaction: [900, 1500], accuracy: 0.55, trapSense: 0.45 },
  NORMAL: { reaction: [600, 1100], accuracy: 0.72, trapSense: 0.7 },
  DIFICIL: { reaction: [380, 760], accuracy: 0.86, trapSense: 0.86 },
  INSANO: { reaction: [260, 580], accuracy: 0.93, trapSense: 0.94 }
} as const;

export function botDecision(event: ArenaEvent, difficulty: BotDifficulty, seed: number): { act: boolean; delay: number; pairGap: number } {
  const profile = BOT_PROFILES[difficulty], random = mulberry32(seed + event.id * 67);
  const understandsTrap = random() < profile.trapSense;
  const act = event.shouldAct ? random() < profile.accuracy : !understandsTrap;
  const delay = profile.reaction[0] + random() * (profile.reaction[1] - profile.reaction[0]);
  return { act, delay: Math.round(delay), pairGap: Math.round(180 + random() * 180) };
}
