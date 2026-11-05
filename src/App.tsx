import { useMemo, useState, type ReactNode } from "react";
import { canonical, rankTeams, type RankedTeam } from "../shared/ranking";
import { teamKey, type Contest, type Dataset } from "../shared/types";
import { validateDataset } from "../shared/validation";
import { download, loadData, persist, published, reset } from "./store";
import ImportDialog, { CountrySelect, pct } from "./ImportDialog";
import Icon from "./Icons";
import Method from "./Method";
import Schools from "./Schools";
import { selectTaiwanHighlights } from "../shared/highlights";
import { useDialogFocus } from "./useDialogFocus";
const initial = loadData();
const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const safeUrl = (s: string) => (/^https?:\/\//i.test(s) ? s : undefined);
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useDialogFocus(onClose);
  return (
    <div className="overlay">
      <section
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export default function App() {
  const [data, setData] = useState<Dataset>(initial.data);
  const [draft, setDraft] = useState(initial.draft);
  const [error, setError] = useState(initial.error);
  const [stale, setStale] = useState(initial.stale);
  const [page, setPage] = useState<
    "ranking" | "schools" | "contests" | "method"
  >("ranking");
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("TW");
  const [school, setSchool] = useState("");
  const [limit, setLimit] = useState(25);
  const hasFilters = query !== "" || region !== "TW" || school !== "";
  function clearFilters() {
    setQuery("");
    setRegion("TW");
    setSchool("");
    setLimit(25);
  }
  const [aliasFrom, setAliasFrom] = useState("");
  const [aliasTo, setAliasTo] = useState("");
  const ranked = useMemo(() => rankTeams(data), [data]);
  const highlights = useMemo(() => selectTaiwanHighlights(ranked), [ranked]);
  const highlightOrder = new Map(highlights.map((t, i) => [t.team, i + 1]));
  const regional = ranked
    .filter((t) => region === "ALL" || t.country === region)
    .map((t, i) => ({ ...t, rank: i + 1 }));
  const schools = [...new Set(regional.map((t) => t.affiliation))]
    .filter(Boolean)
    .sort();
  const filtered = regional.filter(
    (t) =>
      (!school || t.affiliation === school) &&
      `${t.team} ${t.affiliation}`.toLowerCase().includes(query.toLowerCase()),
  );
  const team = ranked.find((t) => t.team === selected);
  const totalTW = ranked.filter((t) => t.country === "TW").length;
  const latest = data.contests
    .map((c) => c.date)
    .sort()
    .at(-1);
  function save(next: Dataset) {
    const normalized = validateDataset(next);
    persist(normalized);
    setData(normalized);
    setDraft(true);
    setStale(false);
    setError("");
  }
  function act(fn: () => void) {
    try {
      fn();
    } catch (e) {
      setError(
        (e as Error).message || "無法儲存，請檢查瀏覽器儲存空間並匯出備份。",
      );
    }
  }
  function addAlias() {
    act(() => {
      const from = teamKey(aliasFrom),
        to = teamKey(aliasTo);
      if (!from || !to || from === to) throw new Error("請輸入兩個不同的隊名");
      if (!ranked.some((t) => t.team === from))
        throw new Error("原隊名不存在於目前榜單");
      const next = { ...data, aliases: { ...data.aliases, [from]: to } };
      validateDataset(next);
      save(next);
      setAliasFrom("");
      setAliasTo("");
    });
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("ranking");
          }}
        >
          <span className="brand-icon">
            <Icon name="code" size={23} />
          </span>
          <span>
            ICPC<span className="brand-sub">POWER RANKING</span>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {(
            [
              ["ranking", "chart", "戰力排行"],
              ["schools", "users", "學校戰力榜"],
              ["contests", "globe", "比賽記分板"],
              ["method", "settings", "評分與隊伍設定"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id)}
            >
              <Icon name={icon} />
              {label}
              {id === "contests" && (
                <span className="nav-count">{data.contests.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" /> COMPETITIVE PROGRAMMING
          <p>
            每一場比賽，
            <br />
            都是實力的下一個座標。
          </p>
          <span className="version">COMMUNITY RANKING · v1.2</span>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <b>
              {page === "ranking"
                ? "戰力排行"
                : page === "schools"
                  ? "學校戰力榜"
                  : page === "contests"
                    ? "比賽記分板"
                    : "評分與隊伍設定"}
            </b>
          </div>
          <div className="top-status">
            <span className="live-dot" />
            {draft ? "本機草稿" : "正式資料"}
            <span className="divider" />
            TW / 2026
          </div>
        </div>
        <div className="content">
          <header className="page-header">
            <div>
              <span className="eyebrow">ICPC POWER RANKING</span>
              <h1>
                {page === "ranking"
                  ? "戰力指數排行。"
                  : page === "schools"
                    ? "從主力，看見學校戰力。"
                    : page === "contests"
                      ? "每一場，都留下紀錄。"
                      : "讓每一分，都有依據。"}
              </h1>
              <p className="muted">
                {page === "ranking"
                  ? "串起每場競賽的表現，看見累積實力。"
                  : page === "schools"
                    ? "各校最強六隊，綜合平均、最高與最低戰力，與隊伍排行同步更新。"
                    : page === "contests"
                      ? "匯入、校準與追蹤，持續建立跨賽站的成績資料。"
                      : "公開的評分規則，可調整的參數，以及你掌握的隊伍身分。"}
              </p>
            </div>
            <div className="actions">
              <button onClick={() => download(data)}>
                <Icon name="download" size={17} />
                匯出資料
              </button>
              <button className="primary" onClick={() => setImporting(true)}>
                <Icon name="upload" size={17} />
                匯入記分板
              </button>
            </div>
          </header>
          {error && (
            <div className="error" role="alert">
              {error}
              <button className="text-button" onClick={() => setError("")}>
                關閉
              </button>
            </div>
          )}
          {draft && (
            <div className="draft-notice">
              <Icon name="info" size={17} />
              <span>
                {stale
                  ? "正式資料已更新；目前仍顯示你保存的舊草稿。"
                  : "目前為本機草稿，僅此瀏覽器可見。"}{" "}
                匯出 rankings.json 放回專案並部署，即可更新公開排行。
              </span>
              <button
                className="text-button"
                onClick={() => setResetting(true)}
              >
                回到正式資料
              </button>
            </div>
          )}
          {page === "ranking" && (
            <>
              <section className="overview">
                <img className="hero-trophy" src="/trophy.png" alt="" />
                <div className="overview-intro">
                  <span className="tag">
                    <span className="live-dot" /> THE BIG PICTURE
                  </span>
                  <h2>實力，不只是一場名次。</h2>
                  <p>
                    以賽場表現、跨站穩定與站點難度，
                    <br />
                    一起構成你的競賽座標。
                  </p>
                  <button
                    onClick={() => setPage("method")}
                    className="hero-link"
                  >
                    了解評分方式 <Icon name="arrow" size={16} />
                  </button>
                </div>
                <div className="overview-stats">
                  <div>
                    <Icon name="users" />
                    <strong>
                      {totalTW}
                      <span>隊</span>
                    </strong>
                    <small>台灣參賽隊伍</small>
                  </div>
                  <div>
                    <Icon name="globe" />
                    <strong>
                      {data.contests.length}
                      <span>場</span>
                    </strong>
                    <small>已收錄比賽</small>
                  </div>
                  <div>
                    <Icon name="calendar" />
                    <strong className="date-stat">
                      {latest ? latest.slice(5).replace("-", " / ") : "—"}
                    </strong>
                    <small>最近比賽 · {latest?.slice(0, 4) ?? "—"}</small>
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">THE FRONT RUNNERS</span>
                  <h2>領先隊伍</h2>
                </div>
                <span className="muted">
                  {region === "TW"
                    ? "台灣隊伍"
                    : region === "ALL"
                      ? "所有隊伍"
                      : region === "OTHER"
                        ? "外國隊伍"
                        : "待確認隊伍"}{" "}
                  · 綜合戰力
                </span>
              </div>
              <div className="leaders">
                {regional.slice(0, 3).map((t, i) => (
                  <button
                    key={t.team}
                    className={`leader leader-${i}`}
                    onClick={() => setSelected(t.team)}
                  >
                    <div className="leader-top">
                      <span className="medal">0{i + 1}</span>
                      <span className="leader-label">
                        {
                          [
                            "LEADING THE WAY",
                            "THE CHALLENGER",
                            "ON THE PODIUM",
                          ][i]
                        }
                      </span>
                      <Icon name="arrow" size={17} />
                    </div>
                    <h3>{t.team}</h3>
                    <p>{t.affiliation || "未提供學校"}</p>
                    <div className="leader-bottom">
                      <strong>
                        {fmt(t.rating)}
                        <small> POWER</small>
                      </strong>
                      <span>{t.count} 場紀錄</span>
                    </div>
                  </button>
                ))}
              </div>
              <section className="panel rankings">
                <div className="panel-heading">
                  <div>
                    <h2>
                      戰力排行榜{" "}
                      <span className="count">{regional.length}</span>
                    </h2>
                    <p className="muted">點選隊伍，查看逐場表現與評分明細。</p>
                  </div>
                  <span className="model-label">
                    MODEL v1.2 <Icon name="info" size={14} />
                  </span>
                </div>
                <details className="highlight-list">
                  <summary>
                    晉級亞太決賽看好名單 {highlights.length} / 10 隊 · 每校最多
                    2 隊
                  </summary>
                  <p className="muted">
                    依完整台灣戰力榜順序選取，超過校額就遞補下一隊；搜尋與篩選不改變名單。此為模型看好的晉級名單，非官方資格判定或經校準的機率。缺少學校者待確認後納入。
                  </p>
                  <ol>
                    {highlights.map((t) => (
                      <li key={t.team}>
                        <button
                          className="team-button"
                          onClick={() => setSelected(t.team)}
                        >
                          {t.team}
                        </button>
                        <small>{t.affiliation}</small>
                      </li>
                    ))}
                  </ol>
                </details>
                <div className="toolbar">
                  <label className="search">
                    <Icon name="search" size={18} />
                    <input
                      aria-label="搜尋隊伍或學校"
                      placeholder="搜尋隊伍或學校…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setLimit(25);
                      }}
                    />
                  </label>
                  <select
                    aria-label="篩選國別"
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setSchool("");
                      setLimit(25);
                    }}
                  >
                    <option value="TW">台灣隊伍</option>
                    <option value="ALL">所有隊伍</option>
                    <option value="OTHER">外國隊伍</option>
                    <option value="UNKNOWN">國別待確認</option>
                  </select>
                  <select
                    aria-label="篩選學校"
                    value={school}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      setLimit(25);
                    }}
                  >
                    <option value="">所有學校</option>
                    {schools.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    className="clear-filters"
                    onClick={clearFilters}
                    disabled={!hasFilters}
                    title="清空搜尋與學校條件，還原為台灣隊伍"
                  >
                    <Icon name="close" size={16} />
                    清除篩選
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="rank-col">排名</th>
                        <th>隊伍 / 學校</th>
                        <th>綜合戰力 ↓</th>
                        <th>Dirty 比率</th>
                        <th>跨站穩定度</th>
                        <th>參賽資料</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, limit).map((t) => (
                        <tr
                          key={t.team}
                          className={
                            highlightOrder.has(t.team)
                              ? "highlighted-team"
                              : undefined
                          }
                        >
                          <td className="rank-number">
                            {String(t.rank).padStart(2, "0")}
                          </td>
                          <td>
                            <button
                              className="team-button"
                              onClick={() => setSelected(t.team)}
                            >
                              {t.team}
                            </button>
                            {highlightOrder.has(t.team) && (
                              <span className="highlight-badge">
                                高機率晉級 #{highlightOrder.get(t.team)}
                              </span>
                            )}
                            <small>{t.affiliation || "未提供學校"}</small>
                          </td>
                          <td>
                            <b className="rating">{fmt(t.rating)}</b>
                          </td>
                          <td>
                            <span
                              className={`dirty-pill ${t.dirty !== null && t.dirty < 0.3 ? "clean" : ""}`}
                            >
                              {pct(t.dirty)}
                            </span>
                          </td>
                          <td className="numeric">
                            {t.siteCount < 2 ? "待驗證" : pct(t.stability)}
                            <small>
                              {t.siteCount < 2
                                ? "僅單站資料"
                                : `站間波動 ${pct(t.spread)}`}
                            </small>
                          </td>
                          <td>
                            <div className="confidence">
                              <span
                                style={{ width: `${t.confidence * 100}%` }}
                              />
                            </div>
                            <small>
                              {t.siteCount} 站 · {t.count} 場
                            </small>
                            <small>
                              Dirty 資料 {t.knownDirtyCount}/{t.count} 場
                            </small>
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`查看 ${t.team}`}
                              onClick={() => setSelected(t.team)}
                            >
                              <Icon name="arrow" size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <div className="empty">
                      <Icon name="search" size={30} />
                      <h3>沒有符合條件的隊伍</h3>
                      <p>試試其他隊名、學校或國別。</p>
                      {hasFilters && (
                        <button onClick={clearFilters}>清除所有篩選</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    顯示 {Math.min(limit, filtered.length)} / {filtered.length}{" "}
                    隊
                  </span>
                  {filtered.length > limit && (
                    <button onClick={() => setLimit(limit + 25)}>
                      顯示更多
                    </button>
                  )}
                  <span>非官方排名 · 少量紀錄僅供參考</span>
                </div>
              </section>
            </>
          )}
          {page === "schools" && (
            <Schools teams={ranked} onSelect={setSelected} />
          )}
          {page === "contests" && (
            <div className="contest-list">
              {[...data.contests]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((c) => (
                  <section className="panel contest-card" key={c.id}>
                    <div className="contest-header">
                      <div className="contest-icon">
                        <Icon name="trophy" size={26} />
                      </div>
                      <div>
                        <span className="eyebrow">
                          {c.date} · {c.site}
                        </span>
                        <h2>{c.name}</h2>
                        <p className="muted">
                          {c.results.length} 隊 · {c.problemCount} 題 ·{" "}
                          {c.status === "preliminary" ? "暫定成績" : "最終成績"}
                        </p>
                      </div>
                      <div className="contest-actions">
                        <button onClick={() => setEditing(structuredClone(c))}>
                          編輯參數
                        </button>
                        <button
                          className="text-button danger"
                          onClick={() => setDeleting(c.id)}
                        >
                          移除
                        </button>
                      </div>
                    </div>
                    <div className="contest-meta">
                      <span>
                        難度係數{" "}
                        <b>
                          {(c.difficulty ?? 1).toFixed(2)}
                          {c.difficulty === null ? "（未校準）" : ""}
                        </b>
                      </span>
                      {safeUrl(c.source) && (
                        <a href={c.source} target="_blank" rel="noreferrer">
                          查看原始榜單 ↗
                        </a>
                      )}
                    </div>
                    <details className="scoreboard-details">
                      <summary>展開逐題記分板</summary>
                      <div className="table-scroll">
                        <table className="scoreboard">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>隊伍</th>
                              <th>AC</th>
                              <th>Penalty</th>
                              {Array.from(
                                { length: c.problemCount },
                                (_, i) => (
                                  <th key={i}>{String.fromCharCode(65 + i)}</th>
                                ),
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {[...c.results]
                              .sort(
                                (a, b) =>
                                  b.solved - a.solved || a.penalty - b.penalty,
                              )
                              .map((r, i) => (
                                <tr key={r.team}>
                                  <td>{r.rank}</td>
                                  <td>
                                    <button
                                      className="team-button"
                                      onClick={() =>
                                        setSelected(
                                          canonical(r.team, data.aliases),
                                        )
                                      }
                                    >
                                      {r.team}
                                    </button>
                                  </td>
                                  <td>{r.solved}</td>
                                  <td>{r.penalty}</td>
                                  {Array.from(
                                    { length: c.problemCount },
                                    (_, j) => {
                                      const p = r.problems[j];
                                      return (
                                        <td
                                          key={j}
                                          className={
                                            p?.solved
                                              ? "ac"
                                              : p?.attempts
                                                ? "wa"
                                                : ""
                                          }
                                          title={
                                            p?.solved
                                              ? "Accepted"
                                              : p?.attempts
                                                ? "未通過"
                                                : "未提交"
                                          }
                                        >
                                          {p?.solved
                                            ? `${p.time ?? "AC"}`
                                            : p?.attempts
                                              ? "−"
                                              : ""}
                                          <small>
                                            {p?.attempts
                                              ? `${p.attempts} tries`
                                              : ""}
                                          </small>
                                        </td>
                                      );
                                    },
                                  )}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </section>
                ))}
              {!data.contests.length && (
                <div className="empty">
                  <h2>開始累積第一場比賽</h2>
                  <button
                    className="primary"
                    onClick={() => setImporting(true)}
                  >
                    匯入記分板
                  </button>
                </div>
              )}
            </div>
          )}
          {page === "method" && (
            <div className="settings-layout">
              <Method data={data} onChange={(next) => act(() => save(next))} />
              <section className="panel aliases">
                <h2>隊名別名對應</h2>
                <p className="muted">
                  只有確認是相同隊伍時才合併；同場中兩隊不可合併為同一個 key。
                </p>
                <div className="alias-form">
                  <input
                    aria-label="原隊名"
                    placeholder="原隊名"
                    value={aliasFrom}
                    onChange={(e) => setAliasFrom(e.target.value)}
                  />
                  <Icon name="arrow" />
                  <input
                    aria-label="統一隊名"
                    placeholder="統一隊名"
                    value={aliasTo}
                    onChange={(e) => setAliasTo(e.target.value)}
                  />
                  <button className="primary" onClick={addAlias}>
                    新增對應
                  </button>
                </div>
                {Object.entries(data.aliases).map(([a, b]) => (
                  <div className="alias-row" key={a}>
                    <span>
                      {a} → {b}
                    </span>
                    <button
                      className="text-button"
                      onClick={() =>
                        act(() => {
                          const aliases = { ...data.aliases };
                          delete aliases[a];
                          save({ ...data, aliases });
                        })
                      }
                    >
                      解除對應
                    </button>
                  </div>
                ))}
              </section>
              <section className="panel publish-help">
                <h2>持續更新到 Vercel</h2>
                <ol>
                  <li>匯入新榜單，確認隊名、國別、日期與賽站名稱。</li>
                  <li>
                    匯出 <code>rankings.json</code>，取代{" "}
                    <code>src/data/rankings.json</code>。
                  </li>
                  <li>
                    推送專案至 Git；Vercel 重新部署後，所有訪客都能看到更新。
                  </li>
                </ol>
                <p className="muted">
                  瀏覽器草稿不會自動公開；清除瀏覽器資料前請匯出備份。
                </p>
              </section>
            </div>
          )}
          <footer className="site-footer">
            <span>
              <Icon name="code" size={15} /> Built for the next contest.
            </span>
            <span>ICPC POWER RANKING · 非官方社群專案</span>
          </footer>
        </div>
      </main>
      {importing && (
        <ImportDialog
          data={data}
          onSave={save}
          onClose={() => setImporting(false)}
        />
      )}
      {team && (
        <Modal title="隊伍戰力明細" onClose={() => setSelected(null)}>
          <TeamDetail
            team={team}
            data={data}
            onChange={(v) => act(() => save(v))}
          />
        </Modal>
      )}
      {editing && (
        <Modal title="編輯比賽參數" onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(() => {
                save({
                  ...data,
                  contests: data.contests.map((c) =>
                    c.id === editing.id ? editing : c,
                  ),
                });
                setEditing(null);
              });
            }}
          >
            <div className="form-grid">
              <label>
                比賽名稱
                <input
                  required
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label>
                日期
                <input
                  required
                  type="date"
                  value={editing.date}
                  onChange={(e) =>
                    setEditing({ ...editing, date: e.target.value })
                  }
                />
              </label>
              <label>
                賽站
                <input
                  required
                  value={editing.site}
                  onChange={(e) =>
                    setEditing({ ...editing, site: e.target.value })
                  }
                />
              </label>
              <label>
                站點難度（0.5–2，留空為未校準）
                <input
                  aria-label="編輯站點難度"
                  type="number"
                  min="0.5"
                  max="2"
                  step="0.05"
                  placeholder="中性值 1.0（未校準）"
                  value={editing.difficulty ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      difficulty:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                成績狀態
                <select
                  value={editing.status ?? "final"}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as Contest["status"],
                    })
                  }
                >
                  <option value="final">最終成績</option>
                  <option value="preliminary">暫定成績</option>
                </select>
              </label>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <footer>
              <button className="primary" type="submit">
                儲存並重新計算
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="移除此場比賽？" onClose={() => setDeleting(null)}>
          <p>此場的成績將從草稿排行中移除。建議先匯出資料備份。</p>
          <footer>
            <button onClick={() => setDeleting(null)}>取消</button>
            <button
              className="primary"
              onClick={() =>
                act(() => {
                  save({
                    ...data,
                    contests: data.contests.filter((c) => c.id !== deleting),
                  });
                  setDeleting(null);
                })
              }
            >
              確認移除
            </button>
          </footer>
        </Modal>
      )}
      {resetting && (
        <Modal title="回到正式資料？" onClose={() => setResetting(false)}>
          <p>
            目前草稿的修改將被清除，恢復至專案發布的資料。請先匯出需要保留的紀錄。
          </p>
          <footer>
            <button onClick={() => download(data)}>先匯出草稿</button>
            <button
              className="primary"
              onClick={() =>
                act(() => {
                  reset();
                  setData(published);
                  setDraft(false);
                  setStale(false);
                  setResetting(false);
                })
              }
            >
              確認還原
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
function TeamDetail({
  team,
  data,
  onChange,
}: {
  team: RankedTeam;
  data: Dataset;
  onChange: (d: Dataset) => void;
}) {
  return (
    <>
      <div className="team-detail-title">
        <span className="eyebrow">TEAM PROFILE · MODEL v1.2</span>
        <h2>{team.team}</h2>
        <p className="muted">{team.affiliation}</p>
        <div className="detail-stats">
          <div>
            <strong>{fmt(team.rating)}</strong>
            <small>戰力 / 100</small>
          </div>
          <div>
            <strong>{team.siteCount} 站</strong>
            <small>{team.count} 場紀錄</small>
          </div>
          <div>
            <strong>{pct(team.dirty)}</strong>
            <small>Dirty 比率</small>
          </div>
        </div>
        <div className="breakdown">
          <span>
            賽場表現：{team.performanceContribution.toFixed(2)} 分 /{" "}
            {data.settings.performanceWeight}
          </span>
          <span>
            跨站穩定：{team.stabilityContribution.toFixed(2)} 分 /{" "}
            {data.settings.stabilityWeight}
          </span>
        </div>
        <p className="muted">
          站點難度貢獻：{team.difficultyContribution.toFixed(2)} /{" "}
          {100 -
            data.settings.performanceWeight -
            data.settings.stabilityWeight}{" "}
          分。
        </p>
        <p className="muted">
          {team.siteCount < 2
            ? "只有一站資料，尚不計跨站穩定分。"
            : `各站水準平均 ${pct(team.level)}，站間標準差 ${pct(team.spread)}。`}{" "}
          Dirty 資料完整 {team.knownDirtyCount} / {team.count} 場。難度已校準{" "}
          {team.knownDifficultyCount} / {team.count} 場。
        </p>
        <label className="inline-label">
          國別{" "}
          <CountrySelect
            value={team.country}
            onChange={(country) =>
              onChange({
                ...data,
                countries: { ...data.countries, [team.team]: country },
              })
            }
          />
        </label>
      </div>
      <section className="history">
        <h3>賽站平均表現</h3>
        <p className="muted">相同賽站先取平均，再讓各站等權。</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>賽站</th>
                <th>場次</th>
                <th>競爭水準 Q</th>
                <th>難度表現</th>
              </tr>
            </thead>
            <tbody>
              {team.stations.map((s) => (
                <tr key={s.key}>
                  <td>{s.name}</td>
                  <td>{s.count}</td>
                  <td>{pct(s.level)}</td>
                  <td>{pct(s.difficulty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {team.history.map((h) => (
        <article className="history" key={h.contest.id}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {h.contest.date} · {h.contest.site}
              </span>
              <h3>{h.contest.name}</h3>
              <p className="muted">
                原隊名：{h.result.team} · {h.result.solved} AC ·{" "}
                {h.result.penalty} penalty
              </p>
            </div>
          </div>
          <div className="breakdown">
            <span>全場名次百分位 {pct(h.score.placementPercentile)}</span>
            <span>同題數微調後 {pct(h.score.percentile)}</span>
            <span>競爭水準 Q {pct(h.score.level)}</span>
            <span>
              Dirty {pct(h.score.dirty)}
              {h.score.dirty === null ? "（計分暫用 50%）" : ""}
            </span>
            <span>
              難度係數 {h.score.difficulty.toFixed(2)}
              {h.contest.difficulty === null ? "（未校準）" : ""}
            </span>
            <span>難度表現 {pct(h.score.difficultyLevel)}</span>
          </div>
          <div className="problem-strip">
            {h.result.problems.map((p) => (
              <div
                className={p.solved ? "ac" : p.attempts ? "wa" : ""}
                key={p.label}
              >
                <b>{p.label}</b>
                <span>{p.solved ? `${p.time ?? "AC"}` : "—"}</span>
                <small>{p.attempts ?? "?"} tries</small>
              </div>
            ))}
          </div>
        </article>
      ))}
    </>
  );
}
