import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActionResult, GameState, InputKind } from "@aura-ego/shared";
import { useAuth } from "../auth-context";
import { Logo } from "../components/Logo";
import { ArenaScene } from "../components/Scenes";
import type { CharacterAction } from "../components/Character";
import { gameSocket } from "../socket";
import { useGame } from "../store";
import { api } from "../api";

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
  const [connection, setConnection] = useState("Boa");
  const [action, setAction] = useState<CharacterAction>("idle");
  const [opponentAction, setOpponentAction] = useState<CharacterAction>("idle");
  const [feedbackByPlayer, setFeedbackByPlayer] = useState<Record<string, PlayerFeedback>>({});
  const [specialOrbVisible, setSpecialOrbVisible] = useState(false);
  const [specialOrbPosition, setSpecialOrbPosition] = useState<[number, number, number]>([-.55, 2.25, .7]);
  const [playerChad, setPlayerChad] = useState(false);
  const [chinPose, setChinPose] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [ended, setEnded] = useState<{ winnerId: string; reason: string; mmrChanges?: Record<string, number> } | null>(null);
  const [tutorial, setTutorial] = useState(!user?.profile.tutorialCompleted);
  const [tutorialStep, setTutorialStep] = useState(0);
  const feedbackId = useRef(0);
  const feedbackTimers = useRef<Record<string, number>>({});
  const actionTimer = useRef<number | null>(null);
  const opponentActionTimer = useRef<number | null>(null);
  const orbHideTimer = useRef<number | null>(null);
  const orbCooldownUntil = useRef(0);
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
    const farmedPair = result.accepted && result.reason !== "PAIR_PENDING" && (
      result.reason === "FARM_PROGRESS" || result.auraDelta > 0 || result.egoDelta > 0
    );
    const now = Date.now();
    if (!farmedPair || now < orbCooldownUntil.current || Math.random() > .018) return;

    orbCooldownUntil.current = now + 14_000;
    setSpecialOrbPosition([
      -.55 + (Math.random() - .5) * 1.15,
      1.95 + Math.random() * .55,
      .55 + Math.random() * .35
    ]);
    setSpecialOrbVisible(true);
    if (orbHideTimer.current) window.clearTimeout(orbHideTimer.current);
    orbHideTimer.current = window.setTimeout(() => setSpecialOrbVisible(false), 5_500);
  }, []);

  const collectSpecialOrb = useCallback(() => {
    if (orbHideTimer.current) window.clearTimeout(orbHideTimer.current);
    if (chinTimer.current) window.clearTimeout(chinTimer.current);
    if (chadTimer.current) window.clearTimeout(chadTimer.current);
    setSpecialOrbVisible(false);
    setPlayerChad(true);
    setChinPose(true);
    chinTimer.current = window.setTimeout(() => setChinPose(false), 2_400);
    chadTimer.current = window.setTimeout(() => setPlayerChad(false), 10_000);
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
      setCountdown(0);
    };
    const state = (payload: { state: GameState | { state: GameState } }) => {
      game.setState("state" in payload.state ? payload.state.state : payload.state);
    };
    const event = (payload: { event: GameState["currentEvent"] }) => game.setEvent(payload.event);
    const actionEvent = (payload: { playerId: string; input?: InputKind; result: ActionResult }) => {
      showFeedback(payload.playerId, payload.result);
      if (payload.playerId === user?.id) maybeSpawnSpecialOrb(payload.result);
      if (payload.playerId !== user?.id) {
        if (opponentActionTimer.current) window.clearTimeout(opponentActionTimer.current);
        setOpponentAction(payload.input === "SIX" ? "six" : "seven");
        opponentActionTimer.current = window.setTimeout(() => setOpponentAction("idle"), 450);
      }
    };
    const end = (payload: { winnerId: string; reason: string; state?: { state: GameState }; mmrChanges?: Record<string, number> }) => {
      setEnded(payload);
      game.setStatus("ENDED");
      if (payload.state?.state) game.setState(payload.state.state);
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
        .off("match:end", end)
        .off("disconnect", disconnect)
        .off("connect", connect);
    };
  }, [game.roomId, game.setEvent, game.setRoom, game.setState, game.setStatus, maybeSpawnSpecialOrb, showFeedback, socket, user?.id]);

  useEffect(() => {
    if (game.status === "PLAYING") return;
    const timer = window.setInterval(() => setCountdown(value => Math.max(1, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [game.status]);

  const input = useCallback((kind: InputKind) => {
    if (game.status !== "PLAYING" || tutorial && tutorialStep < 1) return;
    if (actionTimer.current) window.clearTimeout(actionTimer.current);
    setAction(kind === "SIX" ? "six" : "seven");
    actionTimer.current = window.setTimeout(() => setAction("idle"), 420);
    socket.emit("match:input", { input: kind, clientTimestamp: Date.now(), sequence: game.nextSequence() });
    if (tutorial && tutorialStep === 1 && kind === "SIX") setTutorialStep(2);
    if (tutorial && tutorialStep === 2 && kind === "SEVEN") setTutorialStep(3);
  }, [game.nextSequence, game.status, socket, tutorial, tutorialStep]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === "6") input("SIX");
      if (event.key === "7") input("SEVEN");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [input]);

  const players = game.state ? Object.values(game.state.players) : [];
  const me = players.find(player => player.id === user?.id) || players[0];
  const opponent = players.find(player => player.id !== me?.id);
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
      void api("/users/me", { method: "PATCH", body: JSON.stringify({ tutorialCompleted: true }) })
        .then(() => updateUser({ ...user, profile: { ...user.profile, tutorialCompleted: true } }));
    }
  };

  return <main className="game-page">
    <div className="arena"><ArenaScene
      playerAction={chinPose ? "chin" : action}
      opponentAction={opponentAction}
      playerChad={playerChad}
      specialOrbVisible={specialOrbVisible}
      specialOrbPosition={specialOrbPosition}
      onSpecialOrbClick={collectSpecialOrb}
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
    {game.event && <section className="event-banner act">
      <small>RITMO ATIVO</small>
      <h2>{game.event.name}</h2>
      <div><i style={{ width: `${eventProgress}%` }} /></div>
      <p>Alterne 6 e 7 o mais rápido que conseguir.</p>
    </section>}
    {playerChad ? <div className="chad-effect" role="status"><small>EFEITO RARO</small><strong>MODO GIGACHAD</strong><span>{chinPose ? "Mão no queixo · mandíbula definida" : "Presença máxima por 10s"}</span></div> : null}
    <div className="controls" aria-label="Controles Six Seven">
      <button onPointerDown={() => input("SIX")}><small>TECLA</small><strong>6</strong><span>Mão esquerda</span></button>
      <div><i /> ritmo <i /></div>
      <button onPointerDown={() => input("SEVEN")}><small>TECLA</small><strong>7</strong><span>Mão direita</span></button>
    </div>
    {game.status !== "PLAYING" && !ended && <div className="countdown"><small>POSTURA</small><strong>{countdown}</strong><p>A partida começa no ritmo do servidor</p></div>}
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
    ["Olho na bola rara", "Ela aparece poucas vezes. Toque nela para ativar a mandíbula definida e o gesto da mão no queixo."]
  ][Math.min(step, 5)]!;
  return <div className="tutorial">
    <div className="tutorial-step"><span>{Math.min(step + 1, 6)}/6</span><small>TUTORIAL INTERATIVO</small></div>
    <h2>{content[0]}</h2>
    <p>{content[1]}</p>
    {step !== 1 && step !== 2 && <button className="primary" onClick={step >= 5 ? close : next}>{step >= 5 ? "Entendi, jogar" : "Continuar →"}</button>}
    <button className="text-button" onClick={close}>Pular tutorial</button>
  </div>;
}
