import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAdminEmail, RANK_LABELS, type ActivityEventType, type ActivityLogEntry } from "@aura-ego/shared";
import { useAuth } from "../auth-context";
import { api } from "../api";
import { Logo } from "../components/Logo";

function eventLabel(type: ActivityEventType) {
  if (type === "LOGIN") return "Login";
  return "Partida puxada";
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function metadataSummary(entry: ActivityLogEntry) {
  const meta = entry.metadata;
  if (!meta) return "—";
  if (entry.eventType === "LOGIN") {
    const username = typeof meta.username === "string" ? meta.username : null;
    return username ? `@${username}` : "Sessão aberta";
  }
  const mode = meta.mode === "TRAINING" ? "Treino" : meta.mode === "RANKED" ? "Ranqueada" : null;
  const opponent = typeof meta.opponentUsername === "string" ? meta.opponentUsername : null;
  const difficulty = typeof meta.difficulty === "string" ? meta.difficulty : null;
  const parts = [
    mode,
    opponent ? `vs ${opponent}` : null,
    difficulty
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | ActivityEventType>("ALL");

  useEffect(() => {
    if (!isAdminEmail(user?.email)) return;
    let alive = true;
    setLoading(true);
    api<ActivityLogEntry[]>("/admin/logs")
      .then(rows => { if (alive) setEntries(rows); })
      .catch(err => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar os logs.");
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.email]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return entries;
    return entries.filter(entry => entry.eventType === filter);
  }, [entries, filter]);

  const counts = useMemo(() => ({
    all: entries.length,
    login: entries.filter(e => e.eventType === "LOGIN").length,
    match: entries.filter(e => e.eventType === "MATCH_START").length
  }), [entries]);

  if (!user) return null;
  if (!isAdminEmail(user.email)) return <Navigate to="/" replace />;

  return <main className="ranking-page admin-page">
    <header className="topbar customize-topbar">
      <Logo compact />
      <nav aria-label="Menu principal">
        <button onClick={() => navigate("/")}>Jogar</button>
        <button onClick={() => navigate("/personalizar")}>Personalizar</button>
        <button onClick={() => navigate("/ranking")}>Ranking</button>
        <button className="active">Admin</button>
      </nav>
      <div className="profile-chip">
        <span>{user.username.slice(0, 2).toUpperCase()}</span>
        <div><b>{user.username}</b><small>{RANK_LABELS[user.profile.rank]}</small></div>
        <button aria-label="Sair" onClick={() => void logout()}>↗</button>
      </div>
    </header>

    <section className="ranking-hero">
      <div>
        <span className="eyebrow">CONTROLE DA QUADRA</span>
        <h1>Logs<br /><em>admin.</em></h1>
        <p>Logins e partidas puxadas — treino e ranqueada — registrados em tempo real.</p>
      </div>
      <aside className="ranking-summary" aria-label="Resumo dos logs">
        <div><small>TOTAL</small><strong>{counts.all}</strong></div>
        <div><small>LOGINS</small><strong>{counts.login}</strong></div>
        <div><small>PARTIDAS</small><strong>{counts.match}</strong></div>
      </aside>
    </section>

    <section className="ranking-toolbar admin-toolbar">
      <div className="admin-filters" role="group" aria-label="Filtrar eventos">
        <button type="button" className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>Todos</button>
        <button type="button" className={filter === "LOGIN" ? "active" : ""} onClick={() => setFilter("LOGIN")}>Logins</button>
        <button type="button" className={filter === "MATCH_START" ? "active" : ""} onClick={() => setFilter("MATCH_START")}>Partidas</button>
      </div>
      <small>{filtered.length} de {entries.length} registros</small>
    </section>

    {loading && <div className="ranking-state">Carregando atividade…</div>}
    {error && !loading && <div className="ranking-state error" role="alert">{error}</div>}
    {!loading && !error && filtered.length === 0 && <div className="ranking-state">Nenhum evento registrado ainda.</div>}

    {!loading && !error && filtered.length > 0 && <div className="ranking-table-wrap">
      <table className="ranking-table">
        <thead>
          <tr>
            <th>Quando</th>
            <th>Evento</th>
            <th>E-mail</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(entry => (
            <tr key={entry.id}>
              <td>{formatWhen(entry.createdAt)}</td>
              <td><b className={entry.eventType === "LOGIN" ? "admin-tag login" : "admin-tag match"}>{eventLabel(entry.eventType)}</b></td>
              <td>{entry.email}</td>
              <td>{metadataSummary(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>}
  </main>;
}
