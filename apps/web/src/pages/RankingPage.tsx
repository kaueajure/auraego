import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RANK_LABELS, type Rank } from "@aura-ego/shared";
import { useAuth } from "../auth-context";
import { api } from "../api";
import { Logo } from "../components/Logo";

interface RankingEntry {
  position: number;
  username: string;
  mmr: number;
  rank: Rank;
  wins: number;
  losses: number;
  totalAura: number;
  winStreak: number;
  level: number;
}

export function RankingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<RankingEntry[]>("/users/rankings")
      .then(rows => { if (alive) setEntries(rows); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Não foi possível carregar o ranking."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(entry => entry.username.toLowerCase().includes(needle));
  }, [entries, query]);

  const me = useMemo(() => entries.find(entry => entry.username === user?.username), [entries, user?.username]);

  if (!user) return null;

  return <main className="ranking-page">
    <header className="topbar customize-topbar">
      <Logo compact />
      <nav aria-label="Menu principal">
        <button onClick={() => navigate("/")}>Jogar</button>
        <button onClick={() => navigate("/personalizar")}>Personalizar</button>
        <button className="active">Ranking</button>
      </nav>
      <div className="profile-chip">
        <span>{user.username.slice(0, 2).toUpperCase()}</span>
        <div><b>{user.username}</b><small>{RANK_LABELS[user.profile.rank]}</small></div>
        <button aria-label="Sair" onClick={() => void logout()}>↗</button>
      </div>
    </header>

    <section className="ranking-hero">
      <div>
        <span className="eyebrow">PRESENÇA ONLINE</span>
        <h1>Ranking<br /><em>real.</em></h1>
        <p>Patente sobe com a aura total das partidas online. Treino não conta.</p>
      </div>
      <aside className="ranking-summary" aria-label="Resumo do ranking">
        <div><small>JOGADORES</small><strong>{entries.length}</strong></div>
        <div><small>SUA POSIÇÃO</small><strong>{me ? `#${String(me.position).padStart(2, "0")}` : "—"}</strong></div>
        <div><small>SUA AURA</small><strong>{user.profile.totalAura.toLocaleString("pt-BR")}</strong></div>
      </aside>
    </section>

    <section className="ranking-toolbar">
      <label>
        <span>Buscar presença</span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite um username" autoComplete="off" />
      </label>
      <small>{filtered.length} de {entries.length} cadastros</small>
    </section>

    {loading && <div className="ranking-state">Carregando a arquibancada…</div>}
    {error && !loading && <div className="ranking-state error" role="alert">{error}</div>}
    {!loading && !error && filtered.length === 0 && <div className="ranking-state">Nenhum jogador encontrado.</div>}

    {!loading && !error && filtered.length > 0 && <div className="ranking-table-wrap">
      <table className="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Jogador</th>
            <th>Patente</th>
            <th>Aura</th>
            <th>V / D</th>
            <th>Seq.</th>
            <th>MMR</th>
            <th>Nv.</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(entry => {
            const mine = entry.username === user.username;
            return <tr key={entry.username} className={mine ? "is-me" : entry.position <= 3 ? `top-${entry.position}` : undefined}>
              <td><b>{entry.position}</b></td>
              <td>
                <div className="ranking-player">
                  <span>{entry.username.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{entry.username}</strong>
                    {mine && <small>você</small>}
                  </div>
                </div>
              </td>
              <td>{RANK_LABELS[entry.rank] ?? entry.rank}</td>
              <td>{entry.totalAura.toLocaleString("pt-BR")}</td>
              <td><i>{entry.wins}V</i> / {entry.losses}D</td>
              <td>{entry.winStreak}</td>
              <td>{entry.mmr}</td>
              <td>{entry.level}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>}
  </main>;
}
