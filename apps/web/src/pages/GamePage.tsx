import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActionResult, GameState, InputKind } from "@aura-ego/shared";
import { useAuth } from "../auth-context";
import { Logo } from "../components/Logo";
import { ArenaScene } from "../components/Scenes";
import { gameSocket } from "../socket";
import { useGame } from "../store";
import { api } from "../api";

const labels: Record<string, string> = { ERROU: "Errou", FORA_DO_RITMO: "Fora do ritmo", FORCADO: "Forçou demais", SEM_AURA: "Segura…", LIMPO: "Limpo", AURA_FARM: "Aura farm", SIX_SEVEN_PERFEITO: "Six Seven perfeito", EGO_DESTRUIDO: "Ego destruído", AURA_LENDARIA: "Aura lendária" };
export function GamePage() {
  const { user, updateUser } = useAuth(), game = useGame(), navigate = useNavigate(), socket = gameSocket();
  const [connection, setConnection] = useState("Boa"), [action, setAction] = useState<"idle" | "six" | "seven">("idle"), [opponentAction, setOpponentAction] = useState<"idle" | "six" | "seven">("idle");
  const [countdown, setCountdown] = useState(3), [ended, setEnded] = useState<{ winnerId: string; reason: string; mmrChanges?: Record<string, number> } | null>(null);
  const [tutorial, setTutorial] = useState(!user?.profile.tutorialCompleted), [tutorialStep, setTutorialStep] = useState(0);
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const found = (p: any) => game.setRoom(p.roomId);
    const start = (p: any) => { game.setState(p.state.state || p.state); game.setStatus("PLAYING"); setCountdown(0); };
    const state = (p: any) => game.setState((p.state?.state || p.state) as GameState);
    const event = (p: any) => game.setEvent(p.event);
    const actionEvent = (p: { playerId: string; result: ActionResult }) => {
      if (p.playerId === user?.id) game.setEvaluation(p.result);
      else { setOpponentAction("seven"); setTimeout(() => setOpponentAction("idle"), 450); }
    };
    const end = (p: any) => { setEnded(p); game.setStatus("ENDED"); if (p.state?.state) game.setState(p.state.state); };
    const disconnect = () => setConnection("Reconectando");
    const connect = () => { setConnection("Boa"); if (game.roomId) socket.emit("match:reconnect"); };
    socket.on("match:found", found).on("match:start", start).on("match:state", state).on("match:event", event).on("match:action", actionEvent).on("match:end", end).on("disconnect", disconnect).on("connect", connect);
    socket.emit("match:ready");
    const ping = setInterval(() => {
      const sent = Date.now();
      socket.emit("ping:measure", sent, () => {
        const latency = Date.now() - sent;
        socket.emit("latency:report", latency);
        setConnection(latency < 100 ? "Boa" : latency < 250 ? "Instável" : "Ruim");
      });
    }, 5000);
    return () => { clearInterval(ping); socket.off("match:found", found).off("match:start", start).off("match:state", state).off("match:event", event).off("match:action", actionEvent).off("match:end", end).off("disconnect", disconnect).off("connect", connect); };
  }, [socket, user?.id, game.roomId]);
  useEffect(() => { if (game.status === "PLAYING") return; const timer = setInterval(() => setCountdown(v => Math.max(1, v - 1)), 1000); return () => clearInterval(timer); }, [game.status]);
  const input = useCallback((kind: InputKind) => {
    if (game.status !== "PLAYING" || tutorial && tutorialStep < 1) return;
    setAction(kind === "SIX" ? "six" : "seven"); setTimeout(() => setAction("idle"), 420);
    socket.emit("match:input", { input: kind, clientTimestamp: Date.now(), sequence: game.nextSequence() });
    if (tutorial && tutorialStep === 1 && kind === "SIX") setTutorialStep(2);
    if (tutorial && tutorialStep === 2 && kind === "SEVEN") setTutorialStep(3);
  }, [game.status, tutorial, tutorialStep, socket]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.repeat) return; if (e.key === "6") input("SIX"); if (e.key === "7") input("SEVEN"); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [input]);
  const players = game.state ? Object.values(game.state.players) : [];
  const me = players.find(p => p.id === user?.id) || players[0], opponent = players.find(p => p.id !== me?.id);
  const seconds = game.state ? Math.max(0, Math.ceil((game.state.roundEndsAt - Date.now()) / 1000)) : 45;
  const eventProgress = game.event ? Math.max(0, Math.min(100, ((Date.now() - game.event.startsAt) / game.event.duration) * 100)) : 0;
  const resultStats = useMemo(() => me ? [{ label: "Maior combo", value: me.highestCombo }, { label: "Perfeitos", value: me.perfectActions }, { label: "Erros", value: me.mistakes }, { label: "Spam", value: me.spamViolations }] : [], [me]);
  const leave = () => { socket.emit("match:leave"); game.reset(); navigate("/"); };
  const completeTutorial = () => {
    setTutorial(false);
    if (user && !user.profile.tutorialCompleted) {
      void api("/users/me", { method: "PATCH", body: JSON.stringify({ tutorialCompleted: true }) })
        .then(() => updateUser({ ...user, profile: { ...user.profile, tutorialCompleted: true } }));
    }
  };
  return <main className="game-page">
    <div className="arena"><ArenaScene playerAction={action} opponentAction={opponentAction} /></div>
    <header className="game-top"><Logo compact /><div className="round-info"><small>RODADA</small><strong>{game.state?.round || 1}<i>/3</i></strong></div><div className="timer">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div><div className={`connection ${connection.toLowerCase()}`}><i />{connection}</div><button className="exit" onClick={leave}>Sair</button></header>
    <section className="versus-hud">
      <PlayerHud side="left" name={me?.username || user?.username || "Você"} aura={me?.aura || 0} ego={me?.ego || 100} combo={me?.combo || 0} wins={game.state?.roundWins[me?.id || ""] || 0} />
      <span className="versus">VS</span>
      <PlayerHud side="right" name={opponent?.username || "Rival"} aura={opponent?.aura || 0} ego={opponent?.ego || 100} combo={opponent?.combo || 0} wins={game.state?.roundWins[opponent?.id || ""] || 0} />
    </section>
    {game.event && <section className={`event-banner ${game.event.shouldAct ? "act" : "wait"}`}><small>{game.event.shouldAct ? "OPORTUNIDADE" : "NÃO FORCE"}</small><h2>{game.event.name}</h2><div><i style={{ width: `${eventProgress}%` }} /></div><p>{game.event.shouldAct ? "Encontre a janela. 6, depois 7." : "Às vezes, ficar parado dá mais aura."}</p></section>}
    {game.evaluation && <div key={`${game.evaluation.evaluation}-${Date.now()}`} className={`evaluation ${game.evaluation.auraDelta > 0 ? "positive" : "negative"}`}><strong>{labels[game.evaluation.evaluation]}</strong>{game.evaluation.auraDelta > 0 && <span>+{game.evaluation.auraDelta} aura</span>}</div>}
    <div className="controls" aria-label="Controles Six Seven"><button onPointerDown={() => input("SIX")}><small>TECLA</small><strong>6</strong><span>Mão esquerda</span></button><div><i /> ritmo <i /></div><button onPointerDown={() => input("SEVEN")}><small>TECLA</small><strong>7</strong><span>Mão direita</span></button></div>
    {game.status !== "PLAYING" && !ended && <div className="countdown"><small>POSTURA</small><strong>{countdown}</strong><p>A partida começa no ritmo do servidor</p></div>}
    {tutorial && <Tutorial step={tutorialStep} next={() => setTutorialStep(v => v + 1)} close={completeTutorial} />}
    {ended && <div className="result-overlay"><div className="result-card"><small>PARTIDA ENCERRADA</small><h1>{ended.winnerId === me?.id ? "Presença confirmada." : "Ego abalado."}</h1><p>{ended.winnerId === me?.id ? "Você leu a quadra e controlou o momento." : "A aura volta. O replay ensina."}</p><div className="result-score"><span><small>VOCÊ</small><b>{me?.aura || 0}</b></span><i>—</i><span><small>RIVAL</small><b>{opponent?.aura || 0}</b></span></div><div className="result-stats">{resultStats.map(s => <div key={s.label}><small>{s.label}</small><b>{s.value}</b></div>)}</div>{ended.mmrChanges?.[me?.id || ""] !== undefined && <p className="mmr-change">MMR {ended.mmrChanges[me!.id]! >= 0 ? "+" : ""}{ended.mmrChanges[me!.id]}</p>}<button className="primary" onClick={() => { game.reset(); navigate("/"); }}>Voltar ao menu →</button></div></div>}
  </main>;
}
function PlayerHud({ side, name, aura, ego, combo, wins }: { side: "left" | "right"; name: string; aura: number; ego: number; combo: number; wins: number }) {
  return <div className={`player-hud ${side}`}><div className="hud-name"><span>{name.slice(0, 2).toUpperCase()}</span><div><b>{name}</b><small>{wins} rodada{wins === 1 ? "" : "s"}</small></div></div><div className="aura-score"><small>AURA</small><strong>{aura}</strong>{combo > 1 && <i>x{combo} combo</i>}</div><div className="ego-bar"><span style={{ width: `${ego}%` }} /><small>EGO {ego}</small></div></div>;
}
function Tutorial({ step, next, close }: { step: number; next: () => void; close: () => void }) {
  const content = [
    ["Leia antes de agir", "Os eventos dizem quando entrar — e quando ficar parado. Apertar sem pensar destrói seu ego."],
    ["Comece pelo 6", "Pressione a tecla 6 ou toque no controle esquerdo."],
    ["Agora o 7", "Complete o gesto no ritmo: nem instantâneo, nem atrasado."],
    ["Timing é aura", "A janela central vale mais. Combos aumentam o multiplicador; spam quebra tudo."],
    ["Proteja o ego", "Erros e armadilhas tiram ego. Ao zerar, sua presença fica temporariamente quebrada."]
  ][Math.min(step, 4)]!;
  return <div className="tutorial"><div className="tutorial-step"><span>{Math.min(step + 1, 5)}/5</span><small>TUTORIAL INTERATIVO</small></div><h2>{content[0]}</h2><p>{content[1]}</p>{step !== 1 && step !== 2 && <button className="primary" onClick={step >= 4 ? close : next}>{step >= 4 ? "Entendi, jogar" : "Continuar →"}</button>}<button className="text-button" onClick={close}>Pular tutorial</button></div>;
}
