import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { RANK_LABELS, type BotDifficulty } from "@aura-ego/shared";
import { useAuth } from "../auth-context";
import { Logo } from "../components/Logo";
import { ArenaScene } from "../components/Scenes";
import { gameSocket } from "../socket";
import { useGame } from "../store";

export function LobbyPage() {
  const { user, logout } = useAuth(), navigate = useNavigate(), game = useGame();
  const [modal, setModal] = useState<"training" | "settings" | null>(null), [elapsed, setElapsed] = useState(0), [notice, setNotice] = useState("");
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
  return <main className="lobby">
    <header className="topbar"><Logo compact /><nav aria-label="Menu principal"><button className="active">Jogar</button><button>Personalizar</button><button>Ranking</button></nav><div className="profile-chip"><span>{user.username.slice(0, 2).toUpperCase()}</span><div><b>{user.username}</b><small>{RANK_LABELS[user.profile.rank]}</small></div><button aria-label="Sair" onClick={() => void logout()}>↗</button></div></header>
    <section className="lobby-scene"><ArenaScene /><div className="scene-vignette" /><div className="lobby-title"><span className="eyebrow">QUADRA DO BAIRRO • FIM DE TARDE</span><h1>Defenda sua<br /><em>presença.</em></h1></div></section>
    <aside className="stats-rail">
      <div><small>NÍVEL</small><strong>{String(user.profile.level).padStart(2, "0")}</strong></div>
      <div><small>AURA TOTAL</small><strong>{user.profile.totalAura.toLocaleString("pt-BR")}</strong></div>
      <div><small>MMR</small><strong>{user.profile.mmr}</strong></div>
      <div className="record"><small>HISTÓRICO</small><strong><i>{user.profile.wins}V</i> / {user.profile.losses}D</strong></div>
    </aside>
    <section className="play-cards">
      <motion.button whileHover={{ y: -5 }} className="mode-card training" onClick={() => setModal("training")}><span className="mode-no">01</span><div><small>SEM PRESSÃO</small><h2>Treinar</h2><p>Aprenda o ritmo contra rivais do sistema.</p></div><b>→</b></motion.button>
      <motion.button whileHover={{ y: -5 }} className="mode-card ranked" onClick={online}><span className="live-dot" /><span className="mode-no">02</span><div><small>RANQUEADA • AO VIVO</small><h2>1v1 Online</h2><p>Outro jogador. Uma quadra. Nenhuma desculpa.</p></div><b>→</b></motion.button>
    </section>
    {notice && <div className="toast" role="alert">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {game.status === "SEARCHING" && <div className="queue-overlay"><div className="queue-pulse"><span>6</span><i /><span>7</span></div><h2>Procurando presença à altura</h2><p>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} • faixa ampliando com o tempo</p><button onClick={() => { socket.emit("matchmaking:leave"); game.setStatus("IDLE"); }}>Cancelar busca</button></div>}
    {modal === "training" && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><span className="eyebrow">ESCOLHA O RIVAL</span><h2>Ritmo de treino</h2><div className="difficulty-grid">{(["INICIANTE", "NORMAL", "DIFICIL", "INSANO"] as BotDifficulty[]).map(d => <button key={d} className={game.difficulty === d ? "selected" : ""} onClick={() => game.setDifficulty(d)}><b>{d === "DIFICIL" ? "DIFÍCIL" : d}</b><small>{d === "INICIANTE" ? "Lento e tolerante" : d === "NORMAL" ? "Leitura equilibrada" : d === "DIFICIL" ? "Pune padrões" : "Preciso, ainda humano"}</small></button>)}</div><button className="primary" onClick={training}>Entrar na quadra →</button></div></div>}
  </main>;
}
