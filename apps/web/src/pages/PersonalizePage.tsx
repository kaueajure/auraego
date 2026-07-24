import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PublicUser } from "@aura-ego/shared";
import { isAdminEmail, RANK_LABELS } from "@aura-ego/shared";
import { api } from "../api";
import { useAuth } from "../auth-context";
import { Logo } from "../components/Logo";
import { WardrobeScene } from "../components/WardrobeScene";
import {
  DEFAULT_LOOK_ID,
  lookIdFromCosmetics,
  WARDROBE_LOOKS as LOOKS
} from "../cosmetics";
import { gameSocket } from "../socket";

function Icon({ name }: { name: "rotate" | "zoom" | "check" | "lock" }) {
  if (name === "rotate") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.5A8 8 0 1 1 4 14m.5-5.5V4m0 4.5H9" /></svg>;
  if (name === "zoom") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 5 5M10.5 8v5m-2.5-2.5h5" /></svg>;
  if (name === "lock") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

export function PersonalizePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const equippedFromProfile = lookIdFromCosmetics(user?.profile.selectedCosmetics);
  const [selectedId, setSelectedId] = useState(equippedFromProfile || DEFAULT_LOOK_ID);
  const [equippedId, setEquippedId] = useState(equippedFromProfile || DEFAULT_LOOK_ID);
  const [filter, setFilter] = useState<"todos" | "raros">("todos");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const selected = useMemo(
    () => LOOKS.find(look => look.id === selectedId) ?? LOOKS[0],
    [selectedId]
  );
  const visibleLooks = filter === "todos" ? LOOKS : LOOKS.filter(look => look.rarity !== "Rara");

  if (!user) return null;

  const equip = () => {
    if (saving) return;
    setSaving(true);
    const selectedCosmetics = { ...user.profile.selectedCosmetics, look: selected.id };
    void api<PublicUser>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ selectedCosmetics })
    })
      .then(fresh => {
        updateUser(fresh);
        setEquippedId(selected.id);
        setSaved(true);
        // Socket guarda cosmetics na conexão; força reauth na próxima partida.
        const socket = gameSocket();
        if (socket.connected) socket.disconnect();
        window.setTimeout(() => setSaved(false), 2200);
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  return <main className="customize-page">
    <header className="topbar customize-topbar">
      <Logo compact />
      <nav aria-label="Menu principal">
        <button onClick={() => navigate("/")}>Jogar</button>
        <button className="active">Personalizar</button>
        <button onClick={() => navigate("/ranking")}>Ranking</button>
        {isAdminEmail(user.email) && <button onClick={() => navigate("/admin")}>Admin</button>}
      </nav>
      <div className="profile-chip">
        <span>{user.username.slice(0, 2).toUpperCase()}</span>
        <div><b>{user.username}</b><small>{RANK_LABELS[user.profile.rank]}</small></div>
        <button aria-label="Sair" onClick={() => void logout()}>↗</button>
      </div>
    </header>

    <section className="customize-copy">
      <span className="eyebrow">VESTIÁRIO • COLEÇÃO 01</span>
      <h1>Escolha sua<br /><em>presença.</em></h1>
      <p>Na quadra, antes do primeiro ponto,<br />todo mundo já reparou em você.</p>
    </section>

    <section className="wardrobe-preview" aria-label={`Prévia de ${selected.name}`}>
      <div className="preview-halo" />
      <AnimatePresence mode="wait">
        <motion.div
          className="preview-canvas"
          key={selected.id}
          initial={{ opacity: 0, scale: .96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: .28 }}
        >
          <WardrobeScene look={selected} cosmetics={user.profile.selectedCosmetics} />
        </motion.div>
      </AnimatePresence>
      <div className="preview-index">0{LOOKS.findIndex(look => look.id === selected.id) + 1}</div>
      <div className="preview-controls">
        <span><Icon name="rotate" /> arraste para girar</span>
        <span><Icon name="zoom" /> role para ampliar</span>
      </div>
      <div className="look-detail">
        <span className={`rarity rarity-${selected.rarity.toLowerCase().replace("á", "a").replace("é", "e")}`}>{selected.rarity}</span>
        <small>{selected.collection}</small>
        <h2>{selected.name}</h2>
        <p>{selected.description}</p>
        <div className="look-swatches">{selected.swatches.map(color => <i key={color} style={{ background: color }} />)}</div>
        <button className={`equip-button ${equippedId === selected.id ? "equipped" : ""}`} onClick={equip} disabled={saving}>
          <Icon name="check" />
          {equippedId === selected.id ? "Equipado" : saving ? "Salvando…" : "Usar esta skin"}
        </button>
      </div>
    </section>

    <aside className="skin-drawer">
      <div className="drawer-head">
        <div><span>SEU ARMÁRIO</span><strong>{LOOKS.length} SKINS</strong></div>
        <div className="drawer-filters">
          <button className={filter === "todos" ? "active" : ""} onClick={() => setFilter("todos")}>Todos</button>
          <button className={filter === "raros" ? "active" : ""} onClick={() => setFilter("raros")}>Destaques</button>
        </div>
      </div>
      <div className="skin-list">
        {visibleLooks.map((look, index) => <motion.button
          key={look.id}
          className={`skin-card ${selected.id === look.id ? "selected" : ""}`}
          onClick={() => setSelectedId(look.id)}
          whileHover={{ y: -3 }}
          aria-pressed={selected.id === look.id}
        >
          <span className="skin-card-no">0{index + 1}</span>
          <div className="skin-card-art" style={{ "--skin-a": look.swatches[0], "--skin-b": look.swatches[1] } as React.CSSProperties}>
            <img src={look.portrait} alt={look.name} loading="lazy" />
          </div>
          <div><small>{look.rarity}</small><b>{look.name}</b><span>{look.collection}</span></div>
          {equippedId === look.id && <i className="equipped-mark"><Icon name="check" /></i>}
        </motion.button>)}
        <button className="skin-card locked" disabled>
          <div className="skin-card-art"><Icon name="lock" /></div>
          <div><small>EM BREVE</small><b>???</b><span>Desbloqueie no nível 12</span></div>
        </button>
      </div>
    </aside>

    <AnimatePresence>
      {saved && <motion.div className="save-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Icon name="check" /><div><b>Visual equipado</b><span>{selected.name} está pronto para a quadra.</span></div>
      </motion.div>}
    </AnimatePresence>
  </main>;
}
