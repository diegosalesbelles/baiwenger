"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./mercado.module.css";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Player {
  id: number;
  name: string;
  team: string;
  position: "POR" | "DEF" | "MC" | "DEL" | string;
  price: number;
  salePrice: number;
  status: string;
  priceIncrement: number;
  fitness: (number | null)[];
  consistency: number;
  valuePerPoint: number;
  playedRecently: number;
  nextGame: { rival: string; local: boolean } | null;
  points: number;
  owner: string;
}

interface MarketData {
  players: Player[];
  aiAnalysis: Record<string, string>;
  updatedAt: string;
}

type SortKey = "name" | "price" | "consistency" | "valuePerPoint" | "playedRecently" | "priceIncrement";
type PosFilter = "ALL" | "POR" | "DEF" | "MC" | "DEL";

// ── Helpers ────────────────────────────────────────────────────────────────────

const POS_COLORS: Record<string, string> = {
  POR: "#ffb347", DEF: "#7fff6e", MC: "#3effd2", DEL: "#ff6b6b",
};

function formatPrice(n: number) {
  return n.toLocaleString("de-DE") + " €";
}

function FitnessDots({ fitness }: { fitness: (number | null)[] }) {
  const last5 = fitness.slice(-5);
  return (
    <span className="fitness-dots">
      {last5.map((f, i) => {
        let cls = "fd-null";
        if (f === null) cls = "fd-null";
        else if (typeof f === "number") cls = f > 0 ? "fd-played" : "fd-missed";
        return <span key={i} className={cls} title={f !== null ? String(f) + " pts" : "—"} />;
      })}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok:      { label: "OK",      cls: "badge-ok" },
    injured: { label: "lesión",  cls: "badge-injured" },
    doubt:   { label: "duda",    cls: "badge-doubt" },
    suspended: { label: "sanc.", cls: "badge-injured" },
  };
  const s = map[status] ?? { label: status, cls: "badge-ok" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function PriceChange({ value }: { value: number }) {
  if (value > 0) return <span className="price-up">+{formatPrice(value)}</span>;
  if (value < 0) return <span className="price-down">{formatPrice(value)}</span>;
  return <span className="price-flat">—</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MercadoClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("consistency");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [posFilter, setPosFilter] = useState<PosFilter>("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showOnlyMarket, setShowOnlyMarket] = useState(true);

  useEffect(() => {
    fetch("/api/market")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        if (!r.ok) throw new Error("Error fetching market");
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const players = useMemo(() => {
    if (!data) return [];
    let list = data.players;
    if (showOnlyMarket) list = list.filter((p) => p.owner === "Mercado");
    if (posFilter !== "ALL") list = list.filter((p) => p.position === posFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const va = a[sortKey] as number | string;
      const vb = b[sortKey] as number | string;
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [data, posFilter, search, sortKey, sortDir, showOnlyMarket]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className={styles.sortIcon}>{sortDir === "asc" ? "↑" : "↓"}</span> : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>
            <span className={styles.logoAccent}>b</span>AI<span className={styles.logoAccent}>wenger</span>
          </span>
          <span className={styles.pageTag}>mercado</span>
        </div>
        <div className={styles.headerRight}>
          {data && (
            <span className={styles.updated}>
              actualizado {new Date(data.updatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <span className={styles.userName}>{userName}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>salir</button>
        </div>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {(["ALL", "POR", "DEF", "MC", "DEL"] as PosFilter[]).map((pos) => (
            <button
              key={pos}
              className={`${styles.posBtn} ${posFilter === pos ? styles.posBtnActive : ""}`}
              style={posFilter === pos && pos !== "ALL" ? { borderColor: POS_COLORS[pos], color: POS_COLORS[pos] } : {}}
              onClick={() => setPosFilter(pos)}
            >
              {pos}
            </button>
          ))}
        </div>

        <div className={styles.toolbarRight}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showOnlyMarket}
              onChange={(e) => setShowOnlyMarket(e.target.checked)}
              className={styles.toggleCheck}
            />
            solo mercado
          </label>
          <input
            type="search"
            placeholder="buscar jugador o equipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
          />
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className={styles.stateBox}>
          <div className={styles.skeletonRows}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.skeletonRow}`} style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorBox}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thPos}>pos</th>
                  <th className={`${styles.thName} ${styles.sortable}`} onClick={() => toggleSort("name")}>
                    jugador <SortIcon k="name" />
                  </th>
                  <th>equipo</th>
                  <th>estado</th>
                  <th>rival</th>
                  <th className={styles.sortable} onClick={() => toggleSort("price")}>
                    precio <SortIcon k="price" />
                  </th>
                  <th className={styles.sortable} onClick={() => toggleSort("priceIncrement")}>
                    Δ precio <SortIcon k="priceIncrement" />
                  </th>
                  <th className={styles.sortable} onClick={() => toggleSort("consistency")}>
                    consist. <SortIcon k="consistency" />
                  </th>
                  <th className={styles.sortable} onClick={() => toggleSort("valuePerPoint")}>
                    €/pto <SortIcon k="valuePerPoint" />
                  </th>
                  <th className={styles.sortable} onClick={() => toggleSort("playedRecently")}>
                    actividad <SortIcon k="playedRecently" />
                  </th>
                  <th>forma</th>
                  <th>IA</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 && (
                  <tr>
                    <td colSpan={12} className={styles.empty}>sin resultados</td>
                  </tr>
                )}
                {players.map((p, i) => {
                  const hasAI = !!data?.aiAnalysis[p.id];
                  const isExpanded = expandedId === p.id;
                  return (
                    <>
                      <tr
                        key={p.id}
                        className={`${styles.row} fade-in`}
                        style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <td>
                          <span className={styles.posPill} style={{ color: POS_COLORS[p.position] ?? "var(--text2)" }}>
                            {p.position}
                          </span>
                        </td>
                        <td className={styles.tdName}>
                          <span className={styles.playerName}>{p.name}</span>
                          {p.owner !== "Mercado" && (
                            <span className={styles.ownerTag}>{p.owner}</span>
                          )}
                        </td>
                        <td className={styles.tdMuted}>{p.team}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td className={styles.tdMuted}>
                          {p.nextGame ? (
                            <span>
                              {p.nextGame.rival}
                              <span className={styles.localTag}>{p.nextGame.local ? " (L)" : " (V)"}</span>
                            </span>
                          ) : "—"}
                        </td>
                        <td className={styles.tdNum}>{formatPrice(p.price)}</td>
                        <td className={styles.tdNum}><PriceChange value={p.priceIncrement} /></td>
                        <td className={styles.tdNum}>{p.consistency}</td>
                        <td className={styles.tdNum}>{formatPrice(p.valuePerPoint)}</td>
                        <td className={styles.tdNum}>
                          <span className={styles.actBar}>
                            <span
                              className={styles.actFill}
                              style={{ width: `${p.playedRecently}%`, background: p.playedRecently > 66 ? "var(--accent)" : p.playedRecently > 33 ? "var(--warn)" : "var(--danger)" }}
                            />
                          </span>
                          <span className={styles.actPct}>{p.playedRecently}%</span>
                        </td>
                        <td><FitnessDots fitness={p.fitness} /></td>
                        <td>
                          {hasAI ? (
                            <span className={`badge badge-market ${styles.aiTag}`}>{isExpanded ? "▲ IA" : "▼ IA"}</span>
                          ) : (
                            <span className={styles.noAI}>—</span>
                          )}
                        </td>
                      </tr>

                      {/* AI analysis expanded row */}
                      {isExpanded && hasAI && (
                        <tr key={`${p.id}-ai`} className={styles.aiRow}>
                          <td colSpan={12}>
                            <div className={styles.aiBlock}>
                              <span className={styles.aiLabel}>análisis IA · gemini</span>
                              <p className={styles.aiText}>{data!.aiAnalysis[p.id]}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.footer}>
            <span>{players.length} jugadores</span>
            {data && <span>datos biwenger · {new Date(data.updatedAt).toLocaleDateString("es-ES")}</span>}
          </div>
        </>
      )}
    </div>
  );
}
