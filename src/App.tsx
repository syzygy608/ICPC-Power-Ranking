import { mobileCards } from "./styles/mobileCards";
import FixedTable from "./FixedTable";
import * as stylex from "@stylexjs/stylex";
import { ui } from "./styles/ui";
import { layout } from "./styles/layout";
import { ranking } from "./styles/ranking";
import { panels } from "./styles/panels";
import { countryTint, tables } from "./styles/tables";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { rankTeams, type RankedTeam } from "../shared/ranking";
import {
  countryLabel,
  teamKey,
  type Contest,
  type Dataset,
} from "../shared/types";
import { validateDataset } from "../shared/validation";
import { download, loadData, persist, published, reset } from "./store";
import ImportDialog, { CountrySelect, pct } from "./ImportDialog";
import Icon from "./Icons";
import ContestScoreboard from "./ContestScoreboard";
import Method from "./Method";
import Schools from "./Schools";
import Pagination, { usePagination } from "./Pagination";
import { selectTaiwanHighlights } from "../shared/highlights";
import { useDialogFocus } from "./useDialogFocus";
const pages = [
  ["ranking", "chart", "戰力排行", "排行"],
  ["schools", "users", "學校戰力榜", "學校"],
  ["contests", "globe", "比賽記分板", "賽事"],
  ["method", "settings", "評分與隊伍設定", "設定"],
] as const;

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
    <div {...stylex.props(panels.overlay)}>
      <section
        ref={ref}
        tabIndex={-1}
        {...stylex.props(panels.modal)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header {...stylex.props(panels.modalHeader)}>
          <h2 {...stylex.props(ui.heading)}>{title}</h2>
          <button
            {...stylex.props(ui.button, ui.iconButton)}
            aria-label="關閉"
            onClick={onClose}
          >
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
  const [page, setPage] = useState<(typeof pages)[number][0]>("ranking");
  const pageTitle = pages.find(([id]) => id === page)![2];
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("TW");
  const [school, setSchool] = useState("");
  const hasFilters = query !== "" || region !== "TW" || school !== "";
  function clearFilters() {
    setQuery("");
    setRegion("TW");
    setSchool("");
    pagination.setPage(1);
  }
  const [aliasFrom, setAliasFrom] = useState("");
  const [aliasTo, setAliasTo] = useState("");
  const ranked = useMemo(() => rankTeams(data), [data]);
  const highlights = useMemo(() => selectTaiwanHighlights(ranked), [ranked]);
  const highlightOrder = new Map(highlights.map((t, i) => [t.id, i + 1]));
  const regional = ranked
    .filter(
      (t) =>
        region === "ALL" ||
        (region === "OTHER"
          ? t.country !== "TW" && t.country !== "UNKNOWN"
          : t.country === region),
    )
    .map((t, i) => ({ ...t, rank: i + 1 }));
  const schools = [...new Set(regional.map((t) => t.affiliation))]
    .filter(Boolean)
    .sort();
  const filtered = regional.filter(
    (t) =>
      (!school || t.affiliation === school) &&
      `${t.team} ${t.affiliation}`.toLowerCase().includes(query.toLowerCase()),
  );
  const resultsRef = useRef<HTMLDivElement>(null);
  const pagination = usePagination(filtered.length);
  const team = ranked.find((t) => t.id === selected);
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
  function navigate(next: (typeof pages)[number][0]) {
    if (next === page) return;
    setPage(next);
    window.scrollTo(0, 0);
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
    <div {...stylex.props(layout.shell)}>
      <aside {...stylex.props(layout.sidebar)}>
        <a
          {...stylex.props(ui.link, layout.brand)}
          href="#"
          aria-label="Olympus · 戰力排行"
          onClick={(e) => {
            e.preventDefault();
            navigate("ranking");
          }}
        >
          <span {...stylex.props(layout.brandIcon)}>
            <Icon name="temple" size={26} />
          </span>
          <span {...stylex.props(layout.brandText)}>Olympus</span>
        </a>
        <nav {...stylex.props(layout.nav)} aria-label="主選單">
          {pages.map(([id, icon, label, shortLabel]) => (
            <button
              key={id}
              {...stylex.props(
                ui.button,
                layout.navButton,
                page === id && layout.navActive,
              )}
              aria-label={label}
              aria-current={page === id ? "page" : undefined}
              title={label}
              onClick={() => navigate(id)}
            >
              <Icon name={icon} />
              <span {...stylex.props(layout.navText)}>{label}</span>
              <span {...stylex.props(layout.mobileNavText)} aria-hidden="true">
                {shortLabel}
              </span>
              {id === "contests" && (
                <span {...stylex.props(layout.navCount)}>
                  {data.contests.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>
      <main>
        <div {...stylex.props(layout.content)}>
          <header {...stylex.props(layout.pageHeader)}>
            <div {...stylex.props(layout.headingGroup)}>
              <h1 {...stylex.props(layout.title)}>{pageTitle}</h1>
              <span {...stylex.props(layout.status)}>
                <span {...stylex.props(layout.liveDot)} />
                {draft ? "本機草稿" : "正式資料"}
              </span>
            </div>
            <div {...stylex.props(layout.actions)}>
              <button
                {...stylex.props(ui.button, layout.headerButton)}
                onClick={() => download(data)}
              >
                <Icon name="download" size={17} />
                匯出資料
              </button>
              <button
                {...stylex.props(ui.button, ui.primary, layout.headerButton)}
                onClick={() => setImporting(true)}
              >
                <Icon name="upload" size={17} />
                匯入記分板
              </button>
            </div>
          </header>
          {error && (
            <div {...stylex.props(ui.error)} role="alert">
              {error}
              <button
                {...stylex.props(ui.button, ui.textButton)}
                onClick={() => setError("")}
              >
                關閉
              </button>
            </div>
          )}
          {draft && (
            <div {...stylex.props(ui.notice, layout.draftNotice)}>
              <Icon name="info" size={17} />
              <span {...stylex.props(layout.draftText)}>
                {stale
                  ? "正式資料已更新；目前仍顯示你保存的舊草稿。"
                  : "目前為本機草稿，僅此瀏覽器可見。"}{" "}
                匯出 rankings.json，執行專案的 publish-data
                指令後部署，即可更新公開排行。
              </span>
              <button
                {...stylex.props(ui.button, ui.textButton, layout.draftButton)}
                onClick={() => setResetting(true)}
              >
                回到正式資料
              </button>
            </div>
          )}
          {page === "ranking" && (
            <>
              <section
                {...stylex.props(ranking.overview)}
                aria-label="賽事總覽"
              >
                <div {...stylex.props(ranking.stats)}>
                  <div {...stylex.props(ranking.stat)}>
                    <strong {...stylex.props(ranking.statValue)}>
                      {totalTW}
                      <span {...stylex.props(ranking.statUnit)}>隊</span>
                    </strong>
                    <small {...stylex.props(ranking.statLabel)}>
                      台灣參賽隊伍
                    </small>
                  </div>
                  <div {...stylex.props(ranking.stat)}>
                    <strong {...stylex.props(ranking.statValue)}>
                      {data.contests.length}
                      <span {...stylex.props(ranking.statUnit)}>場</span>
                    </strong>
                    <small {...stylex.props(ranking.statLabel)}>
                      已收錄比賽
                    </small>
                  </div>
                  <div {...stylex.props(ranking.stat)}>
                    <strong {...stylex.props(ranking.statValue)}>
                      {latest ? latest.slice(5).replace("-", " / ") : "—"}
                    </strong>
                    <small {...stylex.props(ranking.statLabel)}>
                      最近比賽 · {latest?.slice(0, 4) ?? "—"}
                    </small>
                  </div>
                </div>
                <button
                  onClick={() => navigate("method")}
                  {...stylex.props(
                    ui.button,
                    ui.textButton,
                    ranking.methodLink,
                  )}
                >
                  了解評分方式 <Icon name="arrow" size={16} />
                </button>
              </section>
              <div {...stylex.props(ui.sectionHeading)}>
                <h2 {...stylex.props(ui.heading)}>月桂殿堂</h2>
                <span {...stylex.props(ui.muted)}>
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
              <div {...stylex.props(ranking.leaders)}>
                {regional.slice(0, 3).map((t, i) => (
                  <button
                    key={t.id}
                    {...stylex.props(
                      ui.button,
                      ranking.leader,
                      i === 0 && ranking.first,
                      i === 2 && ranking.third,
                    )}
                    data-country={t.country}
                    onClick={() => setSelected(t.id)}
                  >
                    <div {...stylex.props(ranking.leaderTop)}>
                      <span {...stylex.props(ranking.medal)}>0{i + 1}</span>
                      <span {...stylex.props(ranking.leaderTrophy)}>
                        <Icon name="trophy" size={19} />
                      </span>
                    </div>
                    <h3
                      {...stylex.props(ui.subheading, ranking.leaderName)}
                      title={t.team}
                    >
                      {t.team}
                    </h3>
                    <p
                      {...stylex.props(
                        ui.paragraph,
                        ui.muted,
                        ranking.leaderSchool,
                      )}
                      title={t.affiliation || undefined}
                    >
                      {t.affiliation || "未提供學校"}
                    </p>
                    <div {...stylex.props(ranking.leaderBottom)}>
                      <strong {...stylex.props(ranking.leaderValue)}>
                        {fmt(t.rating)}
                        <small {...stylex.props(ranking.leaderLabel)}>
                          {" "}
                          分
                        </small>
                      </strong>
                      <span
                        {...stylex.props(
                          ranking.leaderLabel,
                          ranking.leaderRecord,
                        )}
                      >
                        {t.count} 場紀錄
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <section {...stylex.props(ui.panel)}>
                <div {...stylex.props(ui.panelHeading)}>
                  <div>
                    <h2 {...stylex.props(ui.heading)}>
                      戰力排行榜{" "}
                      <span {...stylex.props(ui.count)}>{regional.length}</span>
                    </h2>
                  </div>
                </div>
                <details {...stylex.props(ranking.highlights)}>
                  <summary {...stylex.props(ui.summary)}>
                    晉級亞太決賽看好名單 {highlights.length} / 10 隊 · 每校最多
                    2 隊
                  </summary>
                  <p
                    {...stylex.props(
                      ui.paragraph,
                      ui.muted,
                      ranking.highlightHint,
                    )}
                  >
                    依完整台灣戰力榜順序選取，超過校額就遞補下一隊；搜尋與篩選不改變名單。此為模型看好的晉級名單，非官方資格判定或經校準的機率。缺少學校者待確認後納入。
                  </p>
                  <ol {...stylex.props(ranking.highlightList)}>
                    {highlights.map((t) => (
                      <li {...stylex.props(ranking.highlightItem)} key={t.id}>
                        <button
                          {...stylex.props(
                            ui.button,
                            ui.textButton,
                            tables.teamButton,
                          )}
                          onClick={() => setSelected(t.id)}
                          title={t.team}
                        >
                          {t.team}
                        </button>
                        <small
                          {...stylex.props(tables.cellSmall, tables.ellipsis)}
                          title={t.affiliation}
                        >
                          {t.affiliation}
                        </small>
                      </li>
                    ))}
                  </ol>
                </details>
                <div {...stylex.props(tables.toolbar)}>
                  <label {...stylex.props(tables.search)}>
                    <Icon name="search" size={18} />
                    <input
                      {...stylex.props(ui.field, tables.searchInput)}
                      aria-label="搜尋隊伍或學校"
                      placeholder="搜尋隊伍或學校…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        pagination.setPage(1);
                      }}
                    />
                  </label>
                  <select
                    {...stylex.props(ui.field, ui.select, tables.filter)}
                    aria-label="篩選國別"
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setSchool("");
                      pagination.setPage(1);
                    }}
                  >
                    <option value="TW">台灣隊伍</option>
                    <option value="ALL">所有隊伍</option>
                    <option value="OTHER">外國隊伍</option>
                    <option value="UNKNOWN">國別待確認</option>
                  </select>
                  <select
                    {...stylex.props(ui.field, ui.select, tables.filter)}
                    aria-label="篩選學校"
                    value={school}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      pagination.setPage(1);
                    }}
                  >
                    <option value="">所有學校</option>
                    {schools.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    {...stylex.props(ui.button, tables.clearFilters)}
                    onClick={clearFilters}
                    disabled={!hasFilters}
                    title="清空搜尋與學校條件，還原為台灣隊伍"
                  >
                    <Icon name="close" size={16} />
                    清除篩選
                  </button>
                </div>
                <div {...stylex.props(tables.scroll)} ref={resultsRef}>
                  <FixedTable
                    widths={[64, 280, 110, 100, 128, 144, 64]}
                    flexibleColumn={1}
                    cards
                    label="隊伍戰力排行榜"
                  >
                    <thead role="rowgroup" {...stylex.props(mobileCards.head)}>
                      <tr role="row">
                        <th
                          role="columnheader"
                          scope="col"
                          {...stylex.props(tables.head)}
                        >
                          排名
                        </th>
                        <th
                          role="columnheader"
                          scope="col"
                          {...stylex.props(tables.head)}
                        >
                          隊伍 / 學校
                        </th>
                        <th
                          role="columnheader"
                          scope="col"
                          {...stylex.props(tables.head)}
                        >
                          綜合戰力 ↓
                        </th>
                        <th
                          role="columnheader"
                          scope="col"
                          {...stylex.props(tables.head)}
                        >
                          Dirty 比率
                        </th>
                        <th
                          role="columnheader"
                          scope="col"
                          {...stylex.props(tables.head)}
                        >
                          跨站穩定度
                        </th>
                        <th
                          role="columnheader"
                          scope="col"
                          {...stylex.props(tables.head)}
                        >
                          參賽資料
                        </th>
                        <th
                          role="columnheader"
                          scope="col"
                          {...stylex.props(tables.head)}
                        />
                      </tr>
                    </thead>
                    <tbody role="rowgroup" {...stylex.props(mobileCards.list)}>
                      {filtered
                        .slice(pagination.start, pagination.end)
                        .map((t) => (
                          <tr
                            key={t.id}
                            {...stylex.props(
                              tables.row,
                              mobileCards.row,
                              countryTint(t.country),
                              highlightOrder.has(t.id) && tables.highlighted,
                            )}
                            role="row"
                            data-country={t.country}
                          >
                            <td
                              role="cell"
                              {...stylex.props(
                                tables.cell,
                                tables.rankNumber,
                                mobileCards.cell,
                              )}
                            >
                              {String(t.rank).padStart(2, "0")}
                            </td>
                            <td
                              role="cell"
                              {...stylex.props(
                                tables.cell,
                                mobileCards.cell,
                                mobileCards.name,
                              )}
                            >
                              <div
                                {...stylex.props(
                                  tables.teamHeading,
                                  mobileCards.identity,
                                )}
                              >
                                <button
                                  {...stylex.props(
                                    ui.button,
                                    ui.textButton,
                                    tables.teamButton,
                                    mobileCards.teamButton,
                                  )}
                                  onClick={() => setSelected(t.id)}
                                  title={t.team}
                                >
                                  {t.team}
                                </button>
                                {highlightOrder.has(t.id) && (
                                  <span
                                    {...stylex.props(
                                      ranking.highlightBadge,
                                      ranking.mobileHighlightBadge,
                                    )}
                                  >
                                    高機率晉級 #{highlightOrder.get(t.id)}
                                  </span>
                                )}
                              </div>
                              <small
                                {...stylex.props(
                                  tables.cellSmall,
                                  tables.ellipsis,
                                )}
                                title={t.affiliation || "未提供學校"}
                              >
                                {t.affiliation || "未提供學校"} ·{" "}
                                {countryLabel(t.country)}
                              </small>
                            </td>
                            <td
                              role="cell"
                              {...stylex.props(
                                tables.cell,
                                mobileCards.cell,
                                mobileCards.score,
                              )}
                            >
                              <span {...stylex.props(mobileCards.metricLabel)}>
                                戰力
                              </span>
                              <b {...stylex.props(tables.rating)}>
                                {fmt(t.rating)}
                              </b>
                            </td>
                            <td
                              role="cell"
                              {...stylex.props(
                                tables.cell,
                                mobileCards.cell,
                                mobileCards.metric,
                                mobileCards.firstMetric,
                              )}
                            >
                              <span {...stylex.props(mobileCards.metricLabel)}>
                                Dirty 比率
                              </span>
                              <span
                                {...stylex.props(
                                  tables.dirtyPill,
                                  t.dirty !== null &&
                                    t.dirty < 0.3 &&
                                    tables.positive,
                                )}
                              >
                                {pct(t.dirty)}
                              </span>
                            </td>
                            <td
                              role="cell"
                              {...stylex.props(
                                tables.cell,
                                tables.numeric,
                                mobileCards.cell,
                                mobileCards.metric,
                                mobileCards.secondMetric,
                              )}
                            >
                              <span {...stylex.props(mobileCards.metricLabel)}>
                                跨站穩定度
                              </span>
                              {t.siteCount < 2 ? "待驗證" : pct(t.stability)}
                              <small {...stylex.props(tables.cellSmall)}>
                                {t.siteCount < 2
                                  ? "僅單站資料"
                                  : `站間波動 ${pct(t.spread)}`}
                              </small>
                            </td>
                            <td
                              role="cell"
                              {...stylex.props(
                                tables.cell,
                                mobileCards.cell,
                                mobileCards.metric,
                                mobileCards.thirdMetric,
                              )}
                            >
                              <span {...stylex.props(mobileCards.metricLabel)}>
                                參賽資料
                              </span>
                              <progress
                                {...stylex.props(tables.confidence)}
                                value={t.confidence}
                                max={1}
                                aria-label="資料信心程度"
                              />
                              <small {...stylex.props(tables.cellSmall)}>
                                {t.siteCount} 站 · {t.count} 場
                              </small>
                              <small {...stylex.props(tables.cellSmall)}>
                                Dirty 資料 {t.knownDirtyCount}/{t.count} 場
                              </small>
                            </td>
                            <td
                              role="cell"
                              {...stylex.props(
                                tables.cell,
                                mobileCards.cell,
                                mobileCards.desktopOnly,
                              )}
                            >
                              <button
                                {...stylex.props(ui.button, ui.iconButton)}
                                aria-label={`查看 ${t.team}`}
                                onClick={() => setSelected(t.id)}
                              >
                                <Icon name="info" size={19} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </FixedTable>
                  {!filtered.length && (
                    <div {...stylex.props(ui.empty)}>
                      <Icon name="search" size={30} />
                      <h3 {...stylex.props(ui.subheading)}>
                        沒有符合條件的隊伍
                      </h3>
                      <p {...stylex.props(ui.paragraph)}>
                        試試其他隊名、學校或國別。
                      </p>
                      {hasFilters && (
                        <button
                          {...stylex.props(ui.button)}
                          onClick={clearFilters}
                        >
                          清除所有篩選
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <Pagination
                  pagination={pagination}
                  resultsRef={resultsRef}
                  label="隊伍戰力榜"
                  unit="隊"
                />
              </section>
            </>
          )}
          {page === "schools" && (
            <Schools teams={ranked} onSelect={setSelected} />
          )}
          {page === "contests" && (
            <div {...stylex.props(panels.contestList)}>
              {[...data.contests]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((c) => (
                  <section
                    {...stylex.props(ui.panel, ui.paddedPanel)}
                    key={c.id}
                  >
                    <div {...stylex.props(panels.contestHeader)}>
                      <div {...stylex.props(panels.contestIcon)}>
                        <Icon name="trophy" size={26} />
                      </div>
                      <div {...stylex.props(panels.contestTitle)}>
                        <span {...stylex.props(ui.meta)}>
                          {c.date} · {c.site}
                        </span>
                        <h2 {...stylex.props(ui.heading)}>{c.name}</h2>
                        <p {...stylex.props(ui.paragraph, ui.muted)}>
                          {c.results.length} 隊 · {c.problemCount} 題 ·{" "}
                          {c.status === "preliminary" ? "暫定成績" : "最終成績"}
                        </p>
                      </div>
                      <div {...stylex.props(panels.contestActions)}>
                        <button
                          {...stylex.props(ui.button)}
                          onClick={() => setEditing(structuredClone(c))}
                        >
                          編輯參數
                        </button>
                        <button
                          {...stylex.props(ui.button, ui.textButton, ui.danger)}
                          onClick={() => setDeleting(c.id)}
                        >
                          移除
                        </button>
                      </div>
                    </div>
                    <div {...stylex.props(panels.contestMeta)}>
                      <span>
                        難度係數{" "}
                        <b>
                          {(c.difficulty ?? 1).toFixed(2)}
                          {c.difficulty === null ? "（未校準）" : ""}
                        </b>
                      </span>
                      {safeUrl(c.source) && (
                        <a
                          {...stylex.props(ui.link)}
                          href={c.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          查看原始榜單 ↗
                        </a>
                      )}
                    </div>
                    <ContestScoreboard
                      contest={c}
                      aliases={data.aliases}
                      onSelect={setSelected}
                    />
                  </section>
                ))}
              {!data.contests.length && (
                <div {...stylex.props(ui.empty)}>
                  <h2 {...stylex.props(ui.heading)}>開始累積第一場比賽</h2>
                  <button
                    {...stylex.props(ui.button, ui.primary)}
                    onClick={() => setImporting(true)}
                  >
                    匯入記分板
                  </button>
                </div>
              )}
            </div>
          )}
          {page === "method" && (
            <div {...stylex.props(panels.settingsLayout)}>
              <Method data={data} onChange={(next) => act(() => save(next))} />
              <section {...stylex.props(ui.panel, ui.paddedPanel)}>
                <h2 {...stylex.props(ui.heading)}>隊名別名對應</h2>
                <p {...stylex.props(ui.paragraph, ui.muted)}>
                  只有確認是相同隊伍時才合併；同場中兩隊不可合併為同一個 key。
                </p>
                <div {...stylex.props(panels.aliasForm)}>
                  <input
                    {...stylex.props(ui.field, panels.aliasField)}
                    aria-label="原隊名"
                    placeholder="原隊名"
                    value={aliasFrom}
                    onChange={(e) => setAliasFrom(e.target.value)}
                  />
                  <Icon name="arrow" />
                  <input
                    {...stylex.props(ui.field, panels.aliasField)}
                    aria-label="統一隊名"
                    placeholder="統一隊名"
                    value={aliasTo}
                    onChange={(e) => setAliasTo(e.target.value)}
                  />
                  <button
                    {...stylex.props(ui.button, ui.primary)}
                    onClick={addAlias}
                  >
                    新增對應
                  </button>
                </div>
                {Object.entries(data.aliases).map(([a, b]) => (
                  <div {...stylex.props(panels.aliasRow)} key={a}>
                    <span>
                      {a} → {b}
                    </span>
                    <button
                      {...stylex.props(ui.button, ui.textButton)}
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
              <section
                {...stylex.props(ui.panel, ui.paddedPanel, panels.publishHelp)}
              >
                <h2 {...stylex.props(ui.heading)}>持續更新到 Vercel</h2>
                <ol {...stylex.props(panels.publishList)}>
                  <li>匯入新榜單，確認隊名、國別、日期與賽站名稱。</li>
                  <li>
                    匯出{" "}
                    <code {...stylex.props(panels.code)}>rankings.json</code>
                    ，在專案執行{" "}
                    <code {...stylex.props(panels.code)}>
                      bun run publish-data ./rankings.json
                    </code>
                    。
                  </li>
                  <li>
                    推送專案至 Git；Vercel 重新部署後，所有訪客都能看到更新。
                  </li>
                </ol>
                <p {...stylex.props(ui.paragraph, ui.muted)}>
                  瀏覽器草稿不會自動公開；清除瀏覽器資料前請匯出備份。
                </p>
              </section>
            </div>
          )}
          <footer {...stylex.props(layout.footer)}>
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
            <div {...stylex.props(panels.formGrid)}>
              <label {...stylex.props(ui.label)}>
                比賽名稱
                <input
                  {...stylex.props(ui.field, ui.formField)}
                  required
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label {...stylex.props(ui.label)}>
                日期
                <input
                  {...stylex.props(ui.field, ui.formField)}
                  required
                  type="date"
                  value={editing.date}
                  onChange={(e) =>
                    setEditing({ ...editing, date: e.target.value })
                  }
                />
              </label>
              <label {...stylex.props(ui.label)}>
                賽站
                <input
                  {...stylex.props(ui.field, ui.formField)}
                  required
                  value={editing.site}
                  onChange={(e) =>
                    setEditing({ ...editing, site: e.target.value })
                  }
                />
              </label>
              <label {...stylex.props(ui.label)}>
                站點難度（0.5–2，留空為未校準）
                <input
                  {...stylex.props(ui.field, ui.formField)}
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
              <label {...stylex.props(ui.label)}>
                成績狀態
                <select
                  {...stylex.props(ui.field, ui.select, ui.formField)}
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
              <p {...stylex.props(ui.paragraph, ui.error)} role="alert">
                {error}
              </p>
            )}
            <footer {...stylex.props(panels.modalFooter)}>
              <button {...stylex.props(ui.button, ui.primary)} type="submit">
                儲存並重新計算
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="移除此場比賽？" onClose={() => setDeleting(null)}>
          <p {...stylex.props(ui.paragraph)}>
            此場的成績將從草稿排行中移除。建議先匯出資料備份。
          </p>
          <footer {...stylex.props(panels.modalFooter)}>
            <button
              {...stylex.props(ui.button)}
              onClick={() => setDeleting(null)}
            >
              取消
            </button>
            <button
              {...stylex.props(ui.button, ui.primary)}
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
          <p {...stylex.props(ui.paragraph)}>
            目前草稿的修改將被清除，恢復至專案發布的資料。請先匯出需要保留的紀錄。
          </p>
          <footer {...stylex.props(panels.modalFooter)}>
            <button {...stylex.props(ui.button)} onClick={() => download(data)}>
              先匯出草稿
            </button>
            <button
              {...stylex.props(ui.button, ui.primary)}
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
      <div {...stylex.props(panels.teamTitle)}>
        <h2 {...stylex.props(ui.heading)}>{team.team}</h2>
        <p {...stylex.props(ui.paragraph, ui.muted)}>{team.affiliation}</p>
        <div {...stylex.props(panels.detailStats)}>
          <div>
            <strong {...stylex.props(panels.detailValue)}>
              {fmt(team.rating)}
            </strong>
            <small {...stylex.props(panels.detailLabel)}>戰力 / 100</small>
          </div>
          <div>
            <strong {...stylex.props(panels.detailValue)}>
              {team.siteCount} 站
            </strong>
            <small {...stylex.props(panels.detailLabel)}>
              {team.count} 場紀錄
            </small>
          </div>
          <div>
            <strong {...stylex.props(panels.detailValue)}>
              {pct(team.dirty)}
            </strong>
            <small {...stylex.props(panels.detailLabel)}>Dirty 比率</small>
          </div>
        </div>
        <div {...stylex.props(panels.breakdown)}>
          <span {...stylex.props(panels.breakdownItem)}>
            賽場表現：{team.performanceContribution.toFixed(2)} 分 /{" "}
            {team.performanceWeightApplied}
          </span>
          {data.settings.stabilityWeight > 0 ? (
            <span {...stylex.props(panels.breakdownItem)}>
              {team.siteCount < 2
                ? "穩定度權重已移回賽場表現"
                : `跨站穩定：${team.stabilityContribution.toFixed(2)} 分 / ${team.stabilityWeightApplied}`}
            </span>
          ) : (
            <span {...stylex.props(panels.breakdownItem)}>
              穩定度僅供參考，不計入戰力
            </span>
          )}
        </div>
        <p {...stylex.props(ui.paragraph, ui.muted)}>
          站點難度貢獻：{team.difficultyContribution.toFixed(2)} /{" "}
          {100 -
            data.settings.performanceWeight -
            data.settings.stabilityWeight}{" "}
          分。
        </p>
        <p {...stylex.props(ui.paragraph, ui.muted)}>
          {team.siteCount < 2
            ? "只有一站資料，尚不計跨站穩定分。"
            : `各站水準平均 ${pct(team.level)}，站間標準差 ${pct(team.spread)}。`}{" "}
          Dirty 資料完整 {team.knownDirtyCount} / {team.count} 場。難度已校準{" "}
          {team.knownDifficultyCount} / {team.count} 場。
        </p>
        <label {...stylex.props(panels.inlineLabel, ui.label)}>
          國別{" "}
          <CountrySelect
            value={team.country}
            onChange={(country) =>
              onChange({
                ...data,
                countries: { ...data.countries, [team.id]: country },
              })
            }
          />
        </label>
      </div>
      <section {...stylex.props(panels.history)}>
        <h3 {...stylex.props(ui.subheading)}>賽站平均表現</h3>
        <div {...stylex.props(tables.scroll, panels.historyTable)}>
          <FixedTable widths={[180, 66, 120, 94]} flexibleColumn={0}>
            <thead>
              <tr>
                <th {...stylex.props(tables.head)}>賽站</th>
                <th {...stylex.props(tables.head)}>場次</th>
                <th {...stylex.props(tables.head)}>競爭水準 Q</th>
                <th {...stylex.props(tables.head)}>難度表現</th>
              </tr>
            </thead>
            <tbody>
              {team.stations.map((s) => (
                <tr {...stylex.props(tables.row)} key={s.key}>
                  <td {...stylex.props(tables.cell)}>
                    <span {...stylex.props(tables.ellipsis)} title={s.name}>
                      {s.name}
                    </span>
                  </td>
                  <td {...stylex.props(tables.cell)}>{s.count}</td>
                  <td {...stylex.props(tables.cell)}>{pct(s.level)}</td>
                  <td {...stylex.props(tables.cell)}>{pct(s.difficulty)}</td>
                </tr>
              ))}
            </tbody>
          </FixedTable>
        </div>
      </section>
      {team.history.map((h) => (
        <article {...stylex.props(panels.history)} key={h.contest.id}>
          <div {...stylex.props(ui.sectionHeading)}>
            <div>
              <span {...stylex.props(ui.meta)}>
                {h.contest.date} · {h.contest.site}
              </span>
              <h3 {...stylex.props(ui.subheading)}>{h.contest.name}</h3>
              <p {...stylex.props(ui.paragraph, ui.muted)}>
                原隊名：{h.result.team} · {h.result.solved} AC ·{" "}
                {h.result.penalty} penalty
              </p>
            </div>
          </div>
          <div {...stylex.props(panels.breakdown)}>
            <span {...stylex.props(panels.breakdownItem)}>
              全場名次百分位 {pct(h.score.placementPercentile)}
            </span>
            <span {...stylex.props(panels.breakdownItem)}>
              同題數微調後 {pct(h.score.percentile)}
            </span>
            <span {...stylex.props(panels.breakdownItem)}>
              競爭水準 Q {pct(h.score.level)}
            </span>
            <span {...stylex.props(panels.breakdownItem)}>
              Dirty {pct(h.score.dirty)}
              {h.score.dirty === null ? "（計分暫用 50%）" : ""}
            </span>
            <span {...stylex.props(panels.breakdownItem)}>
              難度係數 {h.score.difficulty.toFixed(2)}
              {h.contest.difficulty === null ? "（未校準）" : ""}
            </span>
            <span {...stylex.props(panels.breakdownItem)}>
              難度表現 {pct(h.score.difficultyLevel)}
            </span>
          </div>
          <div {...stylex.props(panels.problemStrip)}>
            {h.result.problems.map((p) => (
              <div
                {...stylex.props(
                  panels.problem,
                  p.solved
                    ? tables.positive
                    : p.attempts
                      ? tables.negative
                      : null,
                )}
                key={p.label}
              >
                <b>{p.label}</b>
                <span>{p.solved ? `${p.time ?? "AC"}` : "—"}</span>
                <small {...stylex.props(panels.detailLabel)}>
                  {p.attempts ?? "?"} tries
                </small>
              </div>
            ))}
          </div>
        </article>
      ))}
    </>
  );
}
