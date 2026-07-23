import type { Server, Socket } from "socket.io";
import { applyInput, botDecision, createGame, generateEvents, mmrDelta, type ArenaEvent, type BotDifficulty, type GameState, type InputIntent } from "@aura-ego/shared";
import { verifyAccess } from "./security.js";
import { env } from "./config.js";
import { findUserById } from "./repositories/auth-repository.js";
import { createMatch, finishRankedMatch, finishTrainingMatch, getMatchProfiles, markMatchActive } from "./repositories/match-repository.js";

interface ConnectedUser { id: string; username: string; mmr: number; verified: boolean; region: string }
interface QueueEntry { socketId: string; user: ConnectedUser; joinedAt: number }
interface Room {
  id: string; mode: "RANKED" | "TRAINING"; state: GameState; events: ArenaEvent[];
  sockets: Map<string, string>; timer: NodeJS.Timeout; eventCursor: number;
  difficulty?: BotDifficulty; disconnected: Map<string, number>; ending: boolean;
}

const queue = new Map<string, QueueEntry>();
const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>();
const socketUsers = new Map<string, ConnectedUser>();

const safeState = (room: Room) => ({
  roomId: room.id, serverTime: Date.now(), state: room.state,
  connection: "BOA", currentEvent: room.state.currentEvent
});

export function attachRealtime(io: Server) {
  io.use(async (socket, next) => {
    try {
      const claims = verifyAccess(String(socket.handshake.auth.token || ""));
      const user = await findUserById(claims.sub, true);
      if (!user?.profile || user.status !== "ACTIVE") throw new Error("unauthorized");
      const connected = { id: user.id, username: user.username, mmr: user.profile.mmr, verified: Boolean(user.emailVerifiedAt), region: String(socket.handshake.auth.region || "sa-east").slice(0, 24) };
      socketUsers.set(socket.id, connected); socket.data.user = connected; next();
    } catch { next(new Error("UNAUTHORIZED")); }
  });

  io.on("connection", socket => {
    socket.emit("clock:sync", { serverTime: Date.now() });
    socket.on("ping:measure", (sentAt: number, ack) => ack({ sentAt, serverTime: Date.now() }));
    socket.on("latency:report", (latency: number) => { if (Number.isFinite(latency)) socket.data.latency = Math.max(0, Math.min(latency, 2000)); });
    socket.on("matchmaking:join", () => joinQueue(io, socket));
    socket.on("matchmaking:leave", () => leaveQueue(socket, true));
    socket.on("training:start", (payload: { difficulty?: BotDifficulty }) => void startTraining(io, socket, payload?.difficulty));
    socket.on("match:ready", () => {
      const room = getRoomFor(socket); if (!room) return;
      socket.join(room.id); socket.emit("match:state", safeState(room));
    });
    socket.on("match:input", (intent: Omit<InputIntent, "playerId">, ack) => handleInput(io, socket, intent, ack));
    socket.on("match:reconnect", () => reconnect(io, socket));
    socket.on("match:leave", () => forfeit(io, socket));
    socket.on("disconnect", () => disconnect(io, socket));
  });

  const matcher = setInterval(() => findMatches(io), 1000);
  io.engine.on("close", () => clearInterval(matcher));
}

function joinQueue(io: Server, socket: Socket) {
  const user = socketUsers.get(socket.id)!;
  if (!user.verified) return socket.emit("match:error", { code: "EMAIL_NOT_VERIFIED", message: "Verifique seu e-mail para jogar online." });
  if (queueHasUser(user.id) || playerRooms.has(user.id)) return socket.emit("match:error", { code: "ALREADY_QUEUED", message: "Você já está em uma fila ou partida." });
  queue.set(socket.id, { socketId: socket.id, user, joinedAt: Date.now() });
  socket.emit("matchmaking:status", { status: "SEARCHING", joinedAt: Date.now(), range: 100 });
  findMatches(io);
}

function leaveQueue(socket: Socket, notify: boolean) {
  queue.delete(socket.id);
  if (notify) socket.emit("matchmaking:status", { status: "IDLE" });
}
const queueHasUser = (id: string) => [...queue.values()].some(e => e.user.id === id);

function findMatches(io: Server) {
  const entries = [...queue.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  for (const first of entries) {
    if (!queue.has(first.socketId)) continue;
    const waited = (Date.now() - first.joinedAt) / 1000;
    const range = 100 + Math.floor(waited / 10) * 75;
    const second = entries.find(e => e.socketId !== first.socketId && queue.has(e.socketId) && e.user.id !== first.user.id && e.user.region === first.user.region && Math.abs(e.user.mmr - first.user.mmr) <= range);
    if (!second) { io.to(first.socketId).emit("matchmaking:status", { status: "SEARCHING", joinedAt: first.joinedAt, range }); continue; }
    queue.delete(first.socketId); queue.delete(second.socketId);
    void createRankedRoom(io, first, second);
  }
}

async function createRankedRoom(io: Server, first: QueueEntry, second: QueueEntry) {
  const seed = Math.floor(Math.random() * 2_000_000_000);
  const matchId = await createMatch("RANKED", seed, [{ userId: first.user.id, mmrBefore: first.user.mmr }, { userId: second.user.id, mmrBefore: second.user.mmr }]);
  const room = makeRoom(matchId, "RANKED", seed, [first.user, second.user]);
  room.sockets.set(first.user.id, first.socketId); room.sockets.set(second.user.id, second.socketId);
  rooms.set(room.id, room);
  for (const e of [first, second]) { playerRooms.set(e.user.id, room.id); io.sockets.sockets.get(e.socketId)?.join(room.id); }
  io.to(room.id).emit("match:found", { roomId: room.id, players: [first.user, second.user].map(({ id, username, mmr }) => ({ id, username, mmr })), seed });
  setTimeout(() => startRoom(io, room), 2500);
}

async function startTraining(io: Server, socket: Socket, requested?: BotDifficulty) {
  const user = socketUsers.get(socket.id)!;
  if (playerRooms.has(user.id)) return socket.emit("match:error", { code: "ALREADY_PLAYING", message: "Você já está em uma partida." });
  const difficulty: BotDifficulty = ["INICIANTE", "NORMAL", "DIFICIL", "INSANO"].includes(requested || "") ? requested! : "NORMAL";
  const seed = Math.floor(Math.random() * 2_000_000_000);
  const matchId = await createMatch("TRAINING", seed, [{ userId: user.id, mmrBefore: user.mmr }]);
  const room = makeRoom(matchId, "TRAINING", seed, [user, { id: `bot:${matchId}`, username: difficulty === "INSANO" ? "Lenda da Arquibancada" : "Rival do Bairro", mmr: user.mmr, verified: true, region: user.region }]);
  room.difficulty = difficulty; room.sockets.set(user.id, socket.id); rooms.set(room.id, room); playerRooms.set(user.id, room.id); socket.join(room.id);
  socket.emit("match:found", { roomId: room.id, players: Object.values(room.state.players).map(p => ({ id: p.id, username: p.username })), seed, training: true, difficulty });
  setTimeout(() => startRoom(io, room), 1200);
}

function makeRoom(id: string, mode: Room["mode"], seed: number, users: ConnectedUser[]): Room {
  const now = Date.now();
  return { id, mode, state: createGame(seed, users, now), events: [], sockets: new Map(), eventCursor: 0, timer: setInterval(() => {}, 60_000), disconnected: new Map(), ending: false };
}

function startRoom(io: Server, room: Room) {
  clearInterval(room.timer);
  const now = Date.now();
  room.state.phase = "ROUND_ACTIVE"; room.state.roundEndsAt = now + 45_000;
  room.events = generateEvents(room.state.seed + room.state.round, now, 10); room.eventCursor = 0;
  void markMatchActive(room.id);
  io.to(room.id).emit("match:start", { ...safeState(room), countdownEndedAt: now });
  room.timer = setInterval(() => tickRoom(io, room), 100);
}

function tickRoom(io: Server, room: Room) {
  const now = Date.now();
  const event = room.events[room.eventCursor];
  if (event && now >= event.startsAt && now <= event.startsAt + event.duration) {
    if (room.state.currentEvent?.id !== event.id) {
      room.state.currentEvent = event; room.state.version++;
      io.to(room.id).emit("match:event", { event, serverTime: now });
      scheduleBot(io, room, event);
    }
  } else if (event && now > event.startsAt + event.duration) {
    if (!event.shouldAct) rewardPatience(room, event);
    room.eventCursor++; room.state.currentEvent = null; room.state.version++;
    io.to(room.id).emit("match:state", safeState(room));
  }
  if (now >= room.state.roundEndsAt || room.eventCursor >= room.events.length) endRound(io, room);
}

function rewardPatience(room: Room, event: ArenaEvent) {
  for (const player of Object.values(room.state.players)) {
    if (player.lastInputAt < event.startsAt) { player.aura += event.reward; player.combo++; player.highestCombo = Math.max(player.highestCombo, player.combo); }
  }
}

function scheduleBot(io: Server, room: Room, event: ArenaEvent) {
  if (room.mode !== "TRAINING") return;
  const bot = Object.values(room.state.players).find(p => p.id.startsWith("bot:"))!;
  const decision = botDecision(event, room.difficulty!, room.state.seed + room.state.round);
  if (!decision.act) return;
  setTimeout(() => {
    if (room.state.phase !== "ROUND_ACTIVE" || room.state.currentEvent?.id !== event.id) return;
    const now = Date.now();
    applyInput(room.state, { playerId: bot.id, input: "SIX", clientTimestamp: now, sequence: bot.lastSequence + 1 }, now);
    setTimeout(() => {
      const at = Date.now();
      const result = applyInput(room.state, { playerId: bot.id, input: "SEVEN", clientTimestamp: at, sequence: bot.lastSequence + 1 }, at);
      io.to(room.id).emit("match:action", { playerId: bot.id, result, serverTime: at });
      io.to(room.id).emit("match:state", safeState(room));
    }, decision.pairGap);
  }, decision.delay);
}

function handleInput(io: Server, socket: Socket, raw: Omit<InputIntent, "playerId">, ack?: (value: unknown) => void) {
  const room = getRoomFor(socket), user = socketUsers.get(socket.id);
  if (!room || !user) return ack?.({ accepted: false, reason: "ROOM" });
  const latency = Number(socket.data.latency || 0);
  const result = applyInput(room.state, { ...raw, playerId: user.id }, Date.now(), Math.min(latency, env.MAX_LATENCY_COMPENSATION_MS * 2));
  ack?.(result);
  io.to(room.id).emit("match:action", { playerId: user.id, result, serverTime: Date.now() });
  io.to(room.id).emit("match:state", safeState(room));
}

function endRound(io: Server, room: Room) {
  if (room.state.phase !== "ROUND_ACTIVE") return;
  room.state.phase = "ROUND_ENDING";
  const players = Object.values(room.state.players).sort((a, b) => b.aura - a.aura);
  if (players[0]!.aura === players[1]!.aura) {
    const sudden = { ...generateEvents(room.state.seed + 999, Date.now(), 1)[0]!, name: "Morte súbita", kind: "PRESSAO" as const, reward: 67, risk: 67, penalty: 30, startsAt: Date.now() + 1000 };
    room.events = [sudden]; room.eventCursor = 0; room.state.roundEndsAt = sudden.startsAt + sudden.duration; room.state.phase = "ROUND_ACTIVE";
    return io.to(room.id).emit("match:event", { event: sudden, suddenDeath: true, serverTime: Date.now() });
  }
  const roundWinner = players[0]!;
  room.state.roundWins[roundWinner.id] = (room.state.roundWins[roundWinner.id] || 0) + 1;
  io.to(room.id).emit("match:round_end", { round: room.state.round, winnerId: roundWinner.id, state: safeState(room) });
  if (room.state.roundWins[roundWinner.id] >= 2) return void finishRoom(io, room, roundWinner.id, "SCORE");
  room.state.round++; room.state.phase = "INTERMISSION";
  for (const player of players) { player.aura = 0; player.ego = Math.min(100, player.ego + 25); player.combo = 0; }
  setTimeout(() => startRoom(io, room), 3500);
}

async function finishRoom(io: Server, room: Room, winnerId: string, reason: string) {
  if (room.ending) return; room.ending = true; clearInterval(room.timer);
  room.state.phase = "FINISHED"; room.state.winnerId = winnerId;
  const players = Object.values(room.state.players);
  if (room.mode === "RANKED") {
    const [a, b] = players;
    const profiles = await getMatchProfiles([a!.id, b!.id]);
    const updates = players.map((p, index) => {
      const profile = profiles.find(x => x.userId === p.id)!;
      const opponent = profiles.find(x => x.userId !== p.id)!;
      const won = p.id === winnerId, delta = mmrDelta(profile.mmr, opponent.mmr, won ? 1 : 0, reason === "ABANDON" && !won);
      return { p, profile, won, delta, opponent: players[1 - index]! };
    });
    await finishRankedMatch(room.id, winnerId, reason, updates.map(({ p, profile, won, delta }) => ({
      player: p, profile, won, delta, rank: rankFor(profile.mmr + delta)
    })));
    io.to(room.id).emit("match:end", { winnerId, reason, state: safeState(room), mmrChanges: Object.fromEntries(updates.map(u => [u.p.id, u.delta])) });
  } else {
    const human = players.find(p => !p.id.startsWith("bot:"))!;
    await finishTrainingMatch(room.id, winnerId, reason, human);
    io.to(room.id).emit("match:end", { winnerId, reason, state: safeState(room) });
  }
  setTimeout(() => cleanupRoom(room), 5000);
}

function getRoomFor(socket: Socket) {
  const user = socketUsers.get(socket.id), id = user ? playerRooms.get(user.id) : undefined;
  return id ? rooms.get(id) : undefined;
}

function disconnect(io: Server, socket: Socket) {
  leaveQueue(socket, false);
  const user = socketUsers.get(socket.id), room = getRoomFor(socket);
  socketUsers.delete(socket.id);
  if (!user || !room || room.state.phase === "FINISHED") return;
  room.disconnected.set(user.id, Date.now());
  io.to(room.id).emit("match:opponent_disconnected", { playerId: user.id, reconnectUntil: Date.now() + env.RECONNECT_WINDOW_MS });
  setTimeout(() => {
    if (room.disconnected.has(user.id) && !room.ending) {
      const opponent = Object.keys(room.state.players).find(id => id !== user.id)!;
      void finishRoom(io, room, opponent, "ABANDON");
    }
  }, env.RECONNECT_WINDOW_MS);
}

function reconnect(io: Server, socket: Socket) {
  const user = socketUsers.get(socket.id), roomId = user ? playerRooms.get(user.id) : undefined, room = roomId ? rooms.get(roomId) : undefined;
  if (!user || !room || !room.disconnected.has(user.id)) return socket.emit("match:error", { code: "RECONNECT_FAILED", message: "Não há partida para reconectar." });
  room.disconnected.delete(user.id); room.sockets.set(user.id, socket.id); socket.join(room.id);
  io.to(room.id).emit("match:reconnect", { playerId: user.id, state: safeState(room) });
}

function forfeit(io: Server, socket: Socket) {
  const user = socketUsers.get(socket.id), room = getRoomFor(socket);
  if (!user || !room) return;
  const opponent = Object.keys(room.state.players).find(id => id !== user.id)!;
  void finishRoom(io, room, opponent, "FORFEIT");
}

function cleanupRoom(room: Room) {
  clearInterval(room.timer); rooms.delete(room.id);
  for (const id of Object.keys(room.state.players)) if (!id.startsWith("bot:")) playerRooms.delete(id);
}

function rankFor(mmr: number) {
  if (mmr >= 1900) return "AURA_LENDARIA";
  if (mmr >= 1750) return "EGO_INABALAVEL";
  if (mmr >= 1600) return "PRESENCA_DOMINANTE";
  if (mmr >= 1450) return "SIX_SEVEN_CERTIFICADO";
  if (mmr >= 1300) return "FARMER_DE_AURA";
  if (mmr >= 1150) return "AURA_QUESTIONAVEL";
  if (mmr >= 950) return "EGO_FRAGIL";
  return "SEM_PRESENCA";
}
