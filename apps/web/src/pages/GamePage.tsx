import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MathUtils } from "three";
import type { ActionResult, GameState, InputKind, PublicUser } from "@aura-ego/shared";
import { useAuth } from "../auth-context";
import { Logo } from "../components/Logo";
import { ArenaScene, type ArenaVariant } from "../components/Scenes";
import type { CharacterAction } from "../components/Character";
import { gameSocket } from "../socket";
import { useGame } from "../store";
import { api } from "../api";
import { getEquippedLook, getLook } from "../cosmetics";
import {
  labelForCode,
  ORB_CHALLENGE_CODES,
  randomOrbChallenge,
  readControls,
  type ControlBindings,
  type OrbChallengeCode
} from "../controls";

const labels: Record<ActionResult["evaluation"], string> = {
  ERROU: "Errou",
  FORA_DO_RITMO: "Fora do ritmo",
  FORCADO: "Forçou demais",
  SEM_AURA: "Segura…",
  LIMPO: "Limpo",
  AURA_FARM: "Aura farm",
  SIX_SEVEN_PERFEITO: "Six Seven perfeito",
  EGO_DESTRUIDO: "Ego destruído",
  AURA_LENDARIA: "Aura lendária"
};

type FeedbackTone = "pending" | "positive" | "negative" | "neutral";
interface PlayerFeedback {
  id: number;
  label: string;
  detail: string;
  tone: FeedbackTone;
}

function describeResult(result: ActionResult): Omit<PlayerFeedback, "id"> {
  if (result.reason === "PAIR_PENDING") {
    return { label: "6 pronto", detail: "Agora aperte 7", tone: "pending" };
  }
  if (result.reason === "EGO_BROKEN") {
    return { label: "Ego quebrado", detail: "Aguarde um instante", tone: "negative" };
  }
  if (result.reason === "FARM_PROGRESS") {
    return { label: "Farmando", detail: "Mantenha 6 → 7", tone: "pending" };
  }
  if (!result.accepted) {
    return { label: "Entrada ignorada", detail: "Tente novamente", tone: "neutral" };
  }
  if (result.auraDelta > 0) {
    const egoGain = result.egoDelta > 0 ? ` · +${result.egoDelta} ego` : "";
    return { label: labels[result.evaluation], detail: `+${result.auraDelta} aura${egoGain}`, tone: "positive" };
  }
  if (result.egoDelta < 0) {
    return { label: labels[result.evaluation], detail: `${result.egoDelta} ego`, tone: "negative" };
  }
  return { label: labels[result.evaluation], detail: "", tone: "neutral" };
}

export function GamePage() {
  const { user, updateUser } = useAuth();
  const game = useGame();
  const navigate = useNavigate();
  const socket = gameSocket();
  const equippedLook = useMemo(() => getEquippedLook(user?.profile.selectedCosmetics), [user?.profile.selectedCosmetics]);
  const [connection, setConnection] = useState("Boa");
  const [action, setAction] = useState<CharacterAction>("idle");
  const [opponentAction, setOpponentAction] = useState<CharacterAction>("idle");
  const [feedbackByPlayer, setFeedbackByPlayer] = useState<Record<string, PlayerFeedback>>({});
  const [specialOrbVisible, setSpecialOrbVisible] = useState(false);
  const [specialOrbPosition, setSpecialOrbPosition] = useState<[number, number, number]>([-.55, 2.25, .7]);
  const [orbChallenge, setOrbChallenge] = useState<{
    keys: [OrbChallengeCode, OrbChallengeCode];
    progress: number;
  } | null>(null);
  const [controls, setControls] = useState<ControlBindings>(() => readControls());
  const [playerChad, setPlayerChad] = useState(false);
  const [auraMultiplier, setAuraMultiplier] = useState(1);
  const [chinPose, setChinPose] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [roundBreak, setRoundBreak] = useState<{
    round: number;
    winnerId: string;
    matchPoint: boolean;
  } | null>(null);
  const [ended, setEnded] = useState<{ winnerId: string; reason: string; mmrChanges?: Record<string, number> } | null>(null);
  const [tutorial, setTutorial] = useState(!user?.profile.tutorialCompleted);
  const [tutorialStep, setTutorialStep] = useState(0);
  const feedbackId = useRef(0);
  const feedbackTimers = useRef<Record<string, number>>({});
  const actionTimer = useRef<number | null>(null);
  const opponentActionTimer = useRef<number | null>(null);
  const lastActionAt = useRef(0);
  const lastOpponentActionAt = useRef(0);
  const orbHideTimer = useRef<number | null>(null);
  const lastComboSeen = useRef(0);
  const lastOrbMilestone = useRef(0);
  const chinTimer = useRef<number | null>(null);
  const chadTimer = useRef<number | null>(null);

  const showFeedback = useCallback((playerId: string, result: ActionResult) => {
    const previousTimer = feedbackTimers.current[playerId];
    if (previousTimer) window.clearTimeout(previousTimer);

    const feedback = { id: ++feedbackId.current, ...describeResult(result) };
    setFeedbackByPlayer(current => ({ ...current, [playerId]: feedback }));
    feedbackTimers.current[playerId] = window.setTimeout(() => {
      setFeedbackByPlayer(current => {
        if (current[playerId]?.id !== feedback.id) return current;
        const next = { ...current };
        delete next[playerId];
        return next;
      });
      delete feedbackTimers.current[playerId];
    }, result.reason === "PAIR_PENDING" ? 1300 : 1700);
  }, []);

  const maybeSpawnSpecialOrb = useCallback((result: ActionResult) => {
    if (result.combo < lastComboSeen.current) lastOrbMilestone.current = 0;
    lastComboSeen.current = result.combo;
    const milestone = Math.floor(result.combo / 50) * 50;
    const earnedOrb = result.accepted
      && result.reason !== "PAIR_PENDING"
      && result.combo > 0
      && result.combo % 50 === 0
      && milestone > lastOrbMilestone.current;
    if (!earnedOrb) return;

    lastOrbMilestone.current = milestone;
    setSpecialOrbPosition([
      -1.05 + (Math.random() - .5) * .7,
      1.3 + Math.random() * .45,
      .72
    ]);
    const binds = readControls();
    setOrbChallenge({ keys: randomOrbChallenge([binds.six, binds.seven]), progress: 0 });
    setSpecialOrbVisible(true);
    if (orbHideTimer.current) window.clearTimeout(orbHideTimer.current);
    orbHideTimer.current = window.setTimeout(() => {
      setSpecialOrbVisible(false);
      setOrbChallenge(null);
    }, 8_000);
  }, []);

  const collectSpecialOrb = useCallback(() => {
    if (orbHideTimer.current) window.clearTimeout(orbHideTimer.current);
    setSpecialOrbVisible(false);
    setOrbChallenge(null);
    socket.emit("match:collect_orb", (result?: { accepted?: boolean; multiplier?: number }) => {
      if (!result?.accepted) return;
      if (typeof result.multiplier === "number") setAuraMultiplier(result.multiplier);
      if (chinTimer.current) window.clearTimeout(chinTimer.current);
      if (chadTimer.current) window.clearTimeout(chadTimer.current);
      setPlayerChad(true);
      setChinPose(true);
      chinTimer.current = window.setTimeout(() => setChinPose(false), 2_400);
      chadTimer.current = window.setTimeout(() => setPlayerChad(false), 10_000);
    });
  }, [socket]);

  const animateAction = useCallback((nextAction: CharacterAction, hold = false) => {
    const now = performance.now();
    const interval = lastActionAt.current ? now - lastActionAt.current : 700;
    lastActionAt.current = now;
    if (actionTimer.current) window.clearTimeout(actionTimer.current);
    setAction(nextAction);
    if (hold) {
      actionTimer.current = null;
      return;
    }
    const settleDelay = MathUtils.clamp(interval * 1.35, 180, 900);
    actionTimer.current = window.setTimeout(() => {
      setAction("idle");
      actionTimer.current = null;
    }, settleDelay);
  }, []);

  const animateOpponentAction = useCallback((nextAction: CharacterAction, hold = false) => {
    const now = performance.now();
    const interval = lastOpponentActionAt.current ? now - lastOpponentActionAt.current : 700;
    lastOpponentActionAt.current = now;
    if (opponentActionTimer.current) window.clearTimeout(opponentActionTimer.current);
    setOpponentAction(nextAction);
    if (hold) {
      opponentActionTimer.current = null;
      return;
    }
    const settleDelay = MathUtils.clamp(interval * 1.35, 180, 900);
    opponentActionTimer.current = window.setTimeout(() => {
      setOpponentAction("idle");
      opponentActionTimer.current = null;
    }, settleDelay);
  }, []);

  useEffect(() => () => {
    Object.values(feedbackTimers.current).forEach(timer => window.clearTimeout(timer));
    if (actionTimer.current) window.clearTimeout(actionTimer.current);
    if (opponentActionTimer.current) window.clearTimeout(opponentActionTimer.current);
    if (orbHideTimer.current) window.clearTimeout(orbHideTimer.current);
    if (chinTimer.current) window.clearTimeout(chinTimer.current);
    if (chadTimer.current) window.clearTimeout(chadTimer.current);
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const found = (payload: { roomId: string }) => game.setRoom(payload.roomId);
    const start = (payload: { state: GameState | { state: GameState } }) => {
      game.setState("state" in payload.state ? payload.state.state : payload.state);
      game.setStatus("PLAYING");
      setRoundBreak(null);
      setCountdown(0);
      setAuraMultiplier(1);
      lastOrbMilestone.current = 0;
      lastComboSeen.current = 0;
      setSpecialOrbVisible(false);
      setOrbChallenge(null);
      if (actionTimer.current) window.clearTimeout(actionTimer.current);
      if (opponentActionTimer.current) window.clearTimeout(opponentActionTimer.current);
      setAction("idle");
      setOpponentAction("idle");
    };
    const state = (payload: { state: GameState | { state: GameState } }) => {
      game.setState("state" in payload.state ? payload.state.state : payload.state);
    };
    const event = (payload: { event: GameState["currentEvent"] }) => game.setEvent(payload.event);
    const actionEvent = (payload: { playerId: string; input?: InputKind; result: ActionResult }) => {
      showFeedback(payload.playerId, payload.result);
      if (payload.playerId === user?.id) maybeSpawnSpecialOrb(payload.result);
      if (payload.playerId !== user?.id) {
        animateOpponentAction(payload.input === "SIX" ? "six" : "seven");
      }
    };
    const roundEnd = (payload: { round: number; winnerId: string; state?: { state: GameState } }) => {
      if (payload.state?.state) game.setState(payload.state.state);
      const stateAfter = payload.state?.state;
      const myId = user?.id;
      const myWins = myId && stateAfter ? stateAfter.roundWins[myId] || 0 : 0;
      const oppId = stateAfter ? Object.keys(stateAfter.players).find(id => id !== myId) : undefined;
      const oppWins = oppId && stateAfter ? stateAfter.roundWins[oppId] || 0 : 0;
      const matchPoint = Math.max(myWins, oppWins) >= 2;
      const iWonRound = payload.winnerId === myId;
      animateAction(iWonRound ? "victory" : "lose", true);
      animateOpponentAction(iWonRound ? "lose" : "victory", true);
      if (matchPoint) return;
      setRoundBreak({ round: payload.round, winnerId: payload.winnerId, matchPoint: false });
      game.setStatus("ENDED");
    };
    const orbCollected = (payload: { playerId: string; multiplier: number; state?: { state: GameState } }) => {
      if (payload.state?.state) game.setState(payload.state.state);
      if (payload.playerId === user?.id) setAuraMultiplier(payload.multiplier);
    };
    const end = (payload: { winnerId: string; reason: string; state?: { state: GameState }; mmrChanges?: Record<string, number> }) => {
      setEnded(payload);
      setRoundBreak(null);
      game.setStatus("ENDED");
      if (payload.state?.state) game.setState(payload.state.state);
      const iWon = payload.winnerId === user?.id;
      animateAction(iWon ? "victory" : "lose", true);
      animateOpponentAction(iWon ? "lose" : "victory", true);
      if (payload.mmrChanges) {
        void api<PublicUser>("/users/me")
          .then(fresh => updateUser(fresh))
          .catch(() => {});
      }
    };
    const disconnect = () => setConnection("Reconectando");
    const connect = () => {
      setConnection("Boa");
      if (game.roomId) socket.emit("match:reconnect");
    };

    socket
      .on("match:found", found)
      .on("match:start", start)
      .on("match:state", state)
      .on("match:event", event)
      .on("match:action", actionEvent)
      .on("match:round_end", roundEnd)
      .on("match:orb_collected", orbCollected)
      .on("match:end", end)
      .on("disconnect", disconnect)
      .on("connect", connect);
    socket.emit("match:ready");

    const ping = window.setInterval(() => {
      const sent = Date.now();
      socket.emit("ping:measure", sent, () => {
        const latency = Date.now() - sent;
        socket.emit("latency:report", latency);
        setConnection(latency < 100 ? "Boa" : latency < 250 ? "Instável" : "Ruim");
      });
    }, 5000);

    return () => {
      window.clearInterval(ping);
      socket
        .off("match:found", found)
        .off("match:start", start)
        .off("match:state", state)
        .off("match:event", event)
        .off("match:action", actionEvent)
        .off("match:round_end", roundEnd)
        .off("match:orb_collected", orbCollected)
        .off("match:end", end)
        .off("disconnect", disconnect)
        .off("connect", connect);
    };
  }, [animateAction, animateOpponentAction, game.roomId, game.setEvent, game.setRoom, game.setState, game.setStatus, maybeSpawnSpecialOrb, showFeedback, socket, updateUser, user?.id]);

  useEffect(() => {
    if (game.status === "PLAYING" || ended || roundBreak) return;
    const timer = window.setInterval(() => setCountdown(value => Math.max(1, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [ended, game.status, roundBreak]);

  const input = useCallback((kind: InputKind) => {
    if (game.status !== "PLAYING" || roundBreak || ended || tutorial && tutorialStep < 1) return;
    animateAction(kind === "SIX" ? "six" : "seven");
    socket.emit("match:input", { input: kind, clientTimestamp: Date.now(), sequence: game.nextSequence() });
    if (tutorial && tutorialStep === 1 && kind === "SIX") setTutorialStep(2);
    if (tutorial && tutorialStep === 2 && kind === "SEVEN") setTutorialStep(3);
  }, [animateAction, ended, game.nextSequence, game.status, roundBreak, socket, tutorial, tutorialStep]);

  useEffect(() => {
    const sync = () => setControls(readControls());
    window.addEventListener("storage", sync);
    window.addEventListener("aura-ego:controls", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("aura-ego:controls", sync);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (orbChallenge && specialOrbVisible) {
        const expected = orbChallenge.keys[orbChallenge.progress];
        if (event.code === expected) {
          event.preventDefault();
          const nextProgress = orbChallenge.progress + 1;
          if (nextProgress >= orbChallenge.keys.length) {
            collectSpecialOrb();
          } else {
            setOrbChallenge({ ...orbChallenge, progress: nextProgress });
          }
          return;
        }
        if ((ORB_CHALLENGE_CODES as readonly string[]).includes(event.code)) {
          event.preventDefault();
          setOrbChallenge({ ...orbChallenge, progress: 0 });
          return;
        }
      }
      if (event.code === controls.six) {
        event.preventDefault();
        input("SIX");
      }
      if (event.code === controls.seven) {
        event.preventDefault();
        input("SEVEN");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collectSpecialOrb, controls.seven, controls.six, input, orbChallenge, specialOrbVisible]);

  const players = game.state ? Object.values(game.state.players) : [];
  const me = players.find(player => player.id === user?.id) || players[0];
  const opponent = players.find(player => player.id !== me?.id);
  const myLook = useMemo(
    () => (me?.lookId ? getLook(me.lookId) : equippedLook),
    [equippedLook, me?.lookId]
  );
  const opponentLook = useMemo(
    () => getLook(opponent?.lookId),
    [opponent?.lookId]
  );
  const seconds = game.state ? Math.max(0, Math.ceil((game.state.roundEndsAt - Date.now()) / 1000)) : 45;
  const eventProgress = game.event ? Math.max(0, Math.min(100, ((Date.now() - game.event.startsAt) / game.event.duration) * 100)) : 0;
  const resultStats = useMemo(() => me ? [
    { label: "Maior combo", value: me.highestCombo },
    { label: "Perfeitos", value: me.perfectActions },
    { label: "Erros", value: me.mistakes },
    { label: "Pares", value: me.successfulActions }
  ] : [], [me]);

  const leave = () => {
    socket.emit("match:leave");
    game.reset();
    navigate("/");
  };

  const completeTutorial = () => {
    setTutorial(false);
    if (user && !user.profile.tutorialCompleted) {
      void api<PublicUser>("/users/me", { method: "PATCH", body: JSON.stringify({ tutorialCompleted: true }) })
        .then(fresh => updateUser(fresh));
    }
  };

  const iWonRound = roundBreak ? roundBreak.winnerId === me?.id : false;
  const roundWinnerName = roundBreak
    ? (roundBreak.winnerId === me?.id ? me?.username : opponent?.username) || "Jogador"
    : "";

  return <main className="game-page">
    <div className="arena"><ArenaScene
      playerLook={myLook}
      opponentLook={opponentLook}
      playerCosmetics={me?.cosmetics ?? user?.profile.selectedCosmetics}
      opponentCosmetics={opponent?.cosmetics}
      playerAction={chinPose && !roundBreak && !ended ? "chin" : action}
      opponentAction={opponentAction}
      variant={Math.max(0, Math.min(2, (game.state?.round || 1) - 1)) as ArenaVariant}
      playerChad={playerChad}
      playerScale={1}
      specialOrbVisible={specialOrbVisible}
      specialOrbPosition={specialOrbPosition}
    /></div>
    <header className="game-top">
      <Logo compact />
      <div className="round-info"><small>RODADA</small><strong>{game.state?.round || 1}<i>/3</i></strong></div>
      <div className="timer">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div>
      <div className={`connection ${connection.toLowerCase()}`}><i />{connection}</div>
      <button className="exit" onClick={leave}>Sair</button>
    </header>
    <section className="versus-hud">
      <PlayerHud
        side="left"
        name={me?.username || user?.username || "Você"}
        aura={me?.aura || 0}
        ego={me?.ego ?? 0}
        combo={me?.combo || 0}
        wins={game.state?.roundWins[me?.id || ""] || 0}
        feedback={me ? feedbackByPlayer[me.id] : undefined}
      />
      <span className="versus">VS</span>
      <PlayerHud
        side="right"
        name={opponent?.username || "Rival"}
        aura={opponent?.aura || 0}
        ego={opponent?.ego ?? 0}
        combo={opponent?.combo || 0}
        wins={game.state?.roundWins[opponent?.id || ""] || 0}
        feedback={opponent ? feedbackByPlayer[opponent.id] : undefined}
      />
    </section>
    {game.event && !roundBreak && !ended && <section className="event-banner act">
      <small>RITMO ATIVO</small>
      <h2>{game.event.name}</h2>
      <div><i style={{ width: `${eventProgress}%` }} /></div>
      <p>Alterne 6 e 7 o mais rápido que conseguir.</p>
    </section>}
    {playerChad && !roundBreak ? <div className="chad-effect" role="status"><small>EFEITO RARO • FARM {auraMultiplier.toFixed(2)}×</small><strong>MODO GIGACHAD</strong><span>{chinPose ? "Mão no queixo · mandíbula definida" : "Aura farm amplificada"}</span></div> : null}
    {orbChallenge && specialOrbVisible && !roundBreak && !ended ? <div className="orb-challenge" role="status">
      <small>BOLA RARA • SEQUÊNCIA</small>
      <div className="orb-challenge-keys">
        {orbChallenge.keys.map((code, index) => <kbd key={`${code}-${index}`} className={index < orbChallenge.progress ? "done" : index === orbChallenge.progress ? "next" : ""}>{labelForCode(code)}</kbd>)}
      </div>
      <span>Acerte as setas para ativar o GigaChad</span>
    </div> : null}
    <div className="controls" aria-label="Controles Six Seven">
      <button onPointerDown={() => input("SIX")} disabled={!!roundBreak || !!ended}><small>TECLA</small><strong>{labelForCode(controls.six)}</strong><span>Mão esquerda</span></button>
      <div><i /> ritmo <i /></div>
      <button onPointerDown={() => input("SEVEN")} disabled={!!roundBreak || !!ended}><small>TECLA</small><strong>{labelForCode(controls.seven)}</strong><span>Mão direita</span></button>
    </div>
    {game.status !== "PLAYING" && !ended && !roundBreak && <div className="countdown"><small>POSTURA</small><strong>{countdown}</strong><p>A partida começa no ritmo do servidor</p></div>}
    {roundBreak && !ended && <div className={`round-break ${iWonRound ? "won" : "lost"}`} role="status">
      <div className="round-break-card">
        <small>RODADA {roundBreak.round}</small>
        <h2>{iWonRound ? "Você levou a rodada" : "Rodada perdida"}</h2>
        <p><b>{roundWinnerName}</b> fechou com mais aura. Prepare a postura para a próxima.</p>
        <div className="round-break-score">
          <span><small>VOCÊ</small><strong>{game.state?.roundWins[me?.id || ""] || 0}</strong></span>
          <i>placar</i>
          <span><small>RIVAL</small><strong>{game.state?.roundWins[opponent?.id || ""] || 0}</strong></span>
        </div>
        <em>Próxima rodada em instantes…</em>
      </div>
    </div>}
    {tutorial && <Tutorial step={tutorialStep} next={() => setTutorialStep(value => value + 1)} close={completeTutorial} />}
    {ended && <div className="result-overlay"><div className="result-card">
      <small>PARTIDA ENCERRADA</small>
      <h1>{ended.winnerId === me?.id ? "Presença confirmada." : "Ego abalado."}</h1>
      <p>{ended.winnerId === me?.id ? "Você leu a quadra e controlou o momento." : "A aura volta. O replay ensina."}</p>
      <div className="result-score"><span><small>VOCÊ</small><b>{me?.aura || 0}</b></span><i>—</i><span><small>RIVAL</small><b>{opponent?.aura || 0}</b></span></div>
      <div className="result-stats">{resultStats.map(stat => <div key={stat.label}><small>{stat.label}</small><b>{stat.value}</b></div>)}</div>
      {ended.mmrChanges?.[me?.id || ""] !== undefined && <p className="mmr-change">MMR {ended.mmrChanges[me!.id]! >= 0 ? "+" : ""}{ended.mmrChanges[me!.id]}</p>}
      <button className="primary" onClick={() => { game.reset(); navigate("/"); }}>Voltar ao menu →</button>
    </div></div>}
  </main>;
}

function PlayerHud({ side, name, aura, ego, combo, wins, feedback }: {
  side: "left" | "right";
  name: string;
  aura: number;
  ego: number;
  combo: number;
  wins: number;
  feedback?: PlayerFeedback;
}) {
  return <div className={`player-hud ${side}`}>
    <div className="hud-name">
      <span>{name.slice(0, 2).toUpperCase()}</span>
      <div>
        <b>{name}</b>
        <small>{wins} rodada{wins === 1 ? "" : "s"}</small>
        <div className="player-feedback-slot">
          {feedback ? <output key={feedback.id} className={`player-feedback ${feedback.tone}`} aria-live="polite">
            <strong>{feedback.label}</strong>
            {feedback.detail ? <span>{feedback.detail}</span> : null}
          </output> : null}
        </div>
      </div>
    </div>
    <div className="aura-score"><small>AURA</small><strong>{aura}</strong>{combo > 1 && <i>x{combo} combo</i>}</div>
    <div className="ego-bar"><span style={{ width: `${ego}%` }} /><small>EGO {ego}</small></div>
  </div>;
}

function Tutorial({ step, next, close }: { step: number; next: () => void; close: () => void }) {
  const content = [
    ["A graça é acelerar", "Alterne 6 e 7 sem parar. Cada par alimenta o farm; Aura e Ego sobem aos poucos."],
    ["Comece pelo 6", "Pressione a tecla 6 ou toque no controle esquerdo."],
    ["Agora o 7", "Complete o par imediatamente e volte para o 6."],
    ["Velocidade é aura", "Quanto mais rápido você alternar corretamente, mais pares completa antes do relógio zerar."],
    ["Não quebre a sequência", "Tecla repetida ou demora demais quebra o combo. Continue no 6, 7, 6, 7."],
    ["Olho na bola rara", "Ela aparece a cada 50 de combo. Digite a sequência de setas na tela para ativar o GigaChad e multiplicar o farm por 1.1×."]
  ][Math.min(step, 5)]!;
  return <div className="tutorial">
    <div className="tutorial-step"><span>{Math.min(step + 1, 6)}/6</span><small>TUTORIAL INTERATIVO</small></div>
    <h2>{content[0]}</h2>
    <p>{content[1]}</p>
    {step !== 1 && step !== 2 && <button className="primary" onClick={step >= 5 ? close : next}>{step >= 5 ? "Entendi, jogar" : "Continuar →"}</button>}
    <button className="text-button" onClick={close}>Pular tutorial</button>
  </div>;
}
