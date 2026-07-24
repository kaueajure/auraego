import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { isAdminEmail, RANK_LABELS, type BotDifficulty } from "@aura-ego/shared";
import { useAuth } from "../auth-context";
import type { CharacterAction } from "../components/Character";
import { Logo } from "../components/Logo";
import { LobbyShowcaseScene } from "../components/Scenes";
import { getEquippedLook } from "../cosmetics";
import { DEFAULT_CONTROLS, labelForCode, readControls, writeControls, type ControlBindings } from "../controls";
import { gameSocket } from "../socket";
import { useGame } from "../store";

const POSES: { id: CharacterAction; label: string; mark: string }[] = [
  { id: "idle", label: "Presença", mark: "01" },
  { id: "six", label: "Six", mark: "06" },
  { id: "seven", label: "Seven", mark: "07" },
  { id: "chin", label: "Gigachad", mark: "GC" },
  { id: "cross", label: "Cruzado", mark: "CR" },
  { id: "victory", label: "Vitória", mark: "VT" },
  { id: "salute", label: "Saudação", mark: "SD" },
  { id: "focus", label: "Foco", mark: "FC" },
  { id: "champion", label: "Campeão", mark: "CP" },
  { id: "point", label: "Desafio", mark: "DF" }
];

const readPose = (): CharacterAction => {
  const saved = window.localStorage.getItem("aura-ego:lobby-pose") as CharacterAction | null;
  return POSES.some(pose => pose.id === saved) ? saved! : "cross";
};

export function LobbyPage() {
  const { user, logout } = useAuth(), navigate = useNavigate(), game = useGame();
  const [modal, setModal] = useState<"training" | "settings" | null>(null), [elapsed, setElapsed] = useState(0), [notice, setNotice] = useState("");
  const [pose, setPose] = useState<CharacterAction>(readPose);
  const [controls, setControls] = useState<ControlBindings>(() => readControls());
  const [listening, setListening] = useState<"six" | "seven" | null>(null);
  const equippedLook = useMemo(() => getEquippedLook(user?.profile.selectedCosmetics), [user?.profile.selectedCosmetics]);
  const arenaLabel = equippedLook.type === "phil"
    ? "ARENA NEON • DEPOIS DA MEIA-NOITE"
    : equippedLook.type === "charlie"
      ? "COBERTURA DO CENTRO • PÔR DO SOL"
      : equippedLook.type === "banana"
        ? "LOBBY ABSURDA • EMOTE AO VIVO"
        : equippedLook.type === "cj"
          ? "GROVE STREET • LOS SANTOS"
            : equippedLook.type === "order67"
            ? "PEDIDO 67 • SIX SEVEN"
            : equippedLook.type === "simao"
              ? "OESTE • PÓ NA QUADRA"
              : equippedLook.type === "model212"
                ? "STREET • 212"
                : "QUADRA DO BAIRRO • FIM DE TARDE";
  const socket = gameSocket();
  useEffect(() => {
    const found = (payload: any) => { game.setRoom(payload.roomId); game.setStatus("FOUND"); navigate("/partida"); };
    const error = (payload: any) => { setNotice(payload.message); game.setStatus("IDLE"); };
    const status = (payload: any) => game.setStatus(payload.status === "SEARCHING" ? "SEARCHING" : "IDLE");
    socket.on("match:found", found).on("match:error", error).on("matchmaking:status", status);
    return () => { socket.off("match:found", found).off("match:error", error).off("matchmaking:status", status); };
  }, [socket, navigate]);
  useEffect(() => { if (game.status !== "SEARCHING") return; const timer = setInterval(() => setElapsed(Math.floor((Date.now() - game.searchStartedAt) / 1000)), 1000); return () => clearInterval(timer); }, [game.status, game.searchStartedAt]);
  if (!user) return null;
  const online = () => { if (!user.emailVerified) return setNotice("Confirme seu e-mail antes de disputar o ranking."); socket.connect(); game.setStatus("SEARCHING"); socket.emit("matchmaking:join"); };
  const training = () => { socket.connect(); socket.emit("training:start", { difficulty: game.difficulty }); setModal(null); };
  const choosePose = (nextPose: CharacterAction) => {
    setPose(nextPose);
    window.localStorage.setItem("aura-ego:lobby-pose", nextPose);
  };
  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.code === "Escape") {
        setListening(null);
        return;
      }
      if (event.code.startsWith("Meta") || event.code === "Tab" || event.code === "CapsLock") return;
      const next = { ...controls, [listening]: event.code } as ControlBindings;
      if (next.six === next.seven) {
        setNotice("Six e Seven precisam de teclas diferentes.");
        setListening(null);
        return;
      }
      setControls(next);
      writeControls(next);
      setListening(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls, listening]);
  return <main className="lobby">
    <header className="topbar"><Logo compact /><nav aria-label="Menu principal"><button className="active">Jogar</button><button onClick={() => navigate("/personalizar")}>Personalizar</button><button onClick={() => navigate("/ranking")}>Ranking</button>{isAdminEmail(user.email) && <button onClick={() => navigate("/admin")}>Admin</button>}<button onClick={() => setModal("settings")}>Configurações</button></nav><div className="profile-chip"><span>{user.username.slice(0, 2).toUpperCase()}</span><div><b>{user.username}</b><small>{RANK_LABELS[user.profile.rank]}</small></div><button aria-label="Sair" onClick={() => void logout()}>↗</button></div></header>
    <section className="lobby-scene"><LobbyShowcaseScene look={equippedLook} pose={pose} cosmetics={user.profile.selectedCosmetics} /><div className="scene-vignette" /><div className="lobby-title"><span className="eyebrow">{arenaLabel}</span><h1>Defenda sua<br /><em>presença.</em></h1><span className="equipped-look-label">SKIN EQUIPADA <b>{equippedLook.name}</b></span></div></section>
    <section className="pose-picker" aria-label="Poses do personagem">
      <div className="pose-picker-head"><span>POSE DE ENTRADA</span><strong>10 PRESETS</strong></div>
      <div>{POSES.map(item => <button key={item.id} className={pose === item.id ? "active" : ""} onClick={() => choosePose(item.id)} title={item.label} aria-label={item.label} aria-pressed={pose === item.id}><b>{item.mark}</b><span>{item.label}</span></button>)}</div>
    </section>
    <aside className="stats-rail">
      <div><small>NÍVEL</small><strong>{String(user.profile.level).padStart(2, "0")}</strong></div>
      <div><small>AURA TOTAL</small><strong>{user.profile.totalAura.toLocaleString("pt-BR")}</strong></div>
      <div><small>MMR</small><strong>{user.profile.mmr}</strong></div>
      <div className="record"><small>HISTÓRICO</small><strong><i>{user.profile.wins}V</i> / {user.profile.losses}D</strong></div>
    </aside>
    <section className="play-cards">
      <motion.button whileHover={{ y: -5 }} className="mode-card training" onClick={() => setModal("training")}><span className="mode-no">01</span><div><small>SEM ESTATÍSTICAS</small><h2>Treinar</h2><p>Ritmo contra o sistema. Nada conta no ranking.</p></div><b>→</b></motion.button>
      <motion.button whileHover={{ y: -5 }} className="mode-card ranked" onClick={online}><span className="live-dot" /><span className="mode-no">02</span><div><small>RANQUEADA • AO VIVO</small><h2>1v1 Online</h2><p>Outro jogador. Uma quadra. Nenhuma desculpa.</p></div><b>→</b></motion.button>
    </section>
    {notice && <div className="toast" role="alert">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {game.status === "SEARCHING" && <div className="queue-overlay"><div className="queue-pulse"><span>6</span><i /><span>7</span></div><h2>Procurando presença à altura</h2><p>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} • faixa ampliando com o tempo</p><button onClick={() => { socket.emit("matchmaking:leave"); game.setStatus("IDLE"); }}>Cancelar busca</button></div>}
    {modal === "training" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><span className="eyebrow">ESCOLHA O RIVAL</span><h2>Ritmo de treino</h2><div className="difficulty-grid">{(["INICIANTE", "NORMAL", "DIFICIL", "INSANO"] as BotDifficulty[]).map(d => <button key={d} className={game.difficulty === d ? "selected" : ""} onClick={() => game.setDifficulty(d)}><b>{d === "DIFICIL" ? "DIFÍCIL" : d}</b><small>{d === "INICIANTE" ? "Lento e tolerante" : d === "NORMAL" ? "Leitura equilibrada" : d === "DIFICIL" ? "Pune padrões" : "Preciso, ainda humano"}</small></button>)}</div><button className="primary" onClick={training}>Entrar na quadra →</button></div></div>}
    {modal === "settings" && <div className="modal-backdrop" onMouseDown={() => { setListening(null); setModal(null); }}><div className="modal settings-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => { setListening(null); setModal(null); }}>×</button><span className="eyebrow">CONTROLES</span><h2>Teclas Six Seven</h2><p className="settings-copy">Escolha quais teclas fazem o par. A bola rara pede uma sequência de setas separada.</p><div className="keybind-grid">
      <button type="button" className={listening === "six" ? "listening" : ""} onClick={() => setListening("six")}>
        <small>SIX · MÃO ESQUERDA</small>
        <strong>{listening === "six" ? "…" : labelForCode(controls.six)}</strong>
        <span>{listening === "six" ? "Pressione uma tecla" : "Clique para trocar"}</span>
      </button>
      <button type="button" className={listening === "seven" ? "listening" : ""} onClick={() => setListening("seven")}>
        <small>SEVEN · MÃO DIREITA</small>
        <strong>{listening === "seven" ? "…" : labelForCode(controls.seven)}</strong>
        <span>{listening === "seven" ? "Pressione uma tecla" : "Clique para trocar"}</span>
      </button>
    </div>
    <button className="text-button" type="button" onClick={() => { const next = { ...DEFAULT_CONTROLS }; setControls(next); writeControls(next); setListening(null); }}>Restaurar 6 e 7</button>
    <button className="primary" type="button" onClick={() => { setListening(null); setModal(null); }}>Salvar →</button></div></div>}
  </main>;
}
