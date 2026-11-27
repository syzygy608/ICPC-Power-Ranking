import FixedTable from "./FixedTable";
import * as stylex from "@stylexjs/stylex";
import { ui } from "./styles/ui";
import { panels } from "./styles/panels";
import { tables } from "./styles/tables";
import { useState, type FormEvent } from "react";
import { validateDataset } from "../shared/validation";
import {
  defaults,
  type Contest,
  type Country,
  type Dataset,
} from "../shared/types";
import { dirtyRatio } from "../shared/ranking";
import Icon from "./Icons";
import { useDialogFocus } from "./useDialogFocus";
import { upsertContest } from "../shared/data";
export const pct = (v: number | null) =>
  v === null ? "—" : `${(v * 100).toFixed(0)}%`;
export function CountrySelect({
  value,
  onChange,
}: {
  value: Country;
  onChange: (v: Country) => void;
}) {
  return (
    <input
      {...stylex.props(ui.field)}
      aria-label="國別"
      list="country-codes"
      title="輸入 ISO 兩碼國別，例如 DE、FR；也可選待確認"
      value={value}
      onChange={(e) => onChange(e.target.value.trim().toUpperCase() as Country)}
    />
  );
}
export default function ImportDialog({
  data,
  onSave,
  onClose,
}: {
  data: Dataset;
  onSave: (d: Dataset) => void;
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);
  const [raw, setRaw] = useState("");
  const [contest, setContest] = useState<Contest | null>(null);
  const [backup, setBackup] = useState<Dataset | null>(null);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [date, setDate] = useState(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  async function inspect(content = raw) {
    setError("");
    setWarnings([]);
    setContest(null);
    setBackup(null);
    try {
      if (!content.trim()) throw new Error("請先選擇檔案或貼上 HTML / JSON");
      if (content.length > 5_000_000) throw new Error("檔案需小於 5 MB");
      if (content.trim().startsWith("{")) {
        const json = JSON.parse(content);
        if (
          json.version === 1 ||
          json.version === 2 ||
          json.version === 3 ||
          json.version === 4 ||
          json.version === 5 ||
          json.version === 6
        ) {
          setBackup(validateDataset(json));
          return;
        }
        const c = validateDataset({
          version: 6,
          contests: [json],
          aliases: {},
          countries: {},
          settings: defaults,
        }).contests[0];
        setContest(c);
        setName(c.name);
        setId(c.id);
        setDate(c.date);
      } else {
        const { parseScoreboard } = await import("../shared/parser");
        const parsed = parseScoreboard(content);
        setWarnings(parsed.warnings);
        const title =
          parsed.title.replace(/Scoreboard|DOMjudge|[·–—]/gi, "").trim() ||
          "新比賽";
        setContest({
          id: "",
          name: title,
          date,
          site: "",
          difficulty: null,
          problemCount: parsed.problemCount,
          source: "",
          status: "final",
          results: parsed.results,
        });
        setName(title);
        setId("");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (backup) {
        onSave(backup);
        onClose();
        return;
      }
      if (!contest) return;
      const c = { ...contest, name: name.trim(), id: id.trim(), date };
      onSave(upsertContest(data, c));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const replacing = data.contests.some((c) => c.id === id);
  return (
    <div {...stylex.props(panels.overlay)}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        {...stylex.props(panels.modal)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
      >
        <datalist id="country-codes">
          <option value="TW">台灣</option>
          <option value="JP">日本</option>
          <option value="KR">韓國</option>
          <option value="CN">中國</option>
          <option value="HK">香港</option>
          <option value="SG">新加坡</option>
          <option value="US">美國</option>
          <option value="OTHER">其他國家</option>
          <option value="UNKNOWN">待確認</option>
        </datalist>
        <header {...stylex.props(panels.modalHeader)}>
          <div>
            <h2 {...stylex.props(ui.heading)} id="import-title">
              匯入比賽成績
            </h2>
          </div>
          <button
            {...stylex.props(ui.button, ui.iconButton)}
            onClick={onClose}
            aria-label="關閉"
          >
            <Icon name="close" />
          </button>
        </header>
        <p {...stylex.props(ui.paragraph, ui.muted, panels.modalCopy)}>
          上傳 DOMjudge HTML、單場 JSON，或完整
          rankings.json。所有變更先保存為本機草稿。
        </p>
        {!(contest || backup) ? (
          <>
            <label {...stylex.props(panels.dropzone)}>
              <Icon name="upload" size={30} />
              <strong>選擇記分板檔案</strong>
              <span>HTML 或 JSON · 最大 5 MB</span>
              <input
                {...stylex.props(ui.field)}
                type="file"
                accept=".html,.htm,.json,text/html,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 5_000_000) {
                    setError("檔案需小於 5 MB");
                    return;
                  }
                  try {
                    const content = await f.text();
                    setRaw(content);
                    inspect(content);
                  } catch {
                    setError("無法讀取檔案");
                  }
                }}
              />
            </label>
            <details {...stylex.props(panels.pasteDetails)}>
              <summary {...stylex.props(ui.summary)}>
                或直接貼上原始 HTML / JSON
              </summary>
              <textarea
                {...stylex.props(ui.field, panels.textarea)}
                aria-label="原始榜單內容"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="貼上完整的 DOMjudge 網頁原始碼…"
                rows={6}
              />
            </details>
            <button
              {...stylex.props(ui.button, ui.primary)}
              onClick={() => inspect()}
            >
              解析並預覽 <Icon name="arrow" size={16} />
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            {backup ? (
              <div {...stylex.props(ui.notice)}>
                完整資料將取代目前的 {data.contests.length}{" "}
                場比賽、隊名設定與評分參數。即將載入{" "}
                <b>{backup.contests.length} 場比賽</b>。請先匯出舊資料備份。
              </div>
            ) : (
              contest && (
                <>
                  <div {...stylex.props(panels.formGrid)}>
                    <label {...stylex.props(ui.label)}>
                      比賽名稱
                      <input
                        {...stylex.props(ui.field, ui.formField)}
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label {...stylex.props(ui.label)}>
                      比賽 ID（相同 ID 會取代更新）
                      <input
                        {...stylex.props(ui.field, ui.formField)}
                        required
                        placeholder="例如 topc-2026"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                      />
                    </label>
                    <label {...stylex.props(ui.label)}>
                      比賽日期
                      <input
                        {...stylex.props(ui.field, ui.formField)}
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label {...stylex.props(ui.label)}>
                      賽站（同站跨屆使用相同名稱）
                      <input
                        {...stylex.props(ui.field, ui.formField)}
                        required
                        list="known-stations"
                        placeholder="選擇既有賽站或輸入新站名"
                        value={contest.site}
                        onChange={(e) =>
                          setContest({ ...contest, site: e.target.value })
                        }
                      />
                      <datalist id="known-stations">
                        {[...new Set(data.contests.map((c) => c.site))].map(
                          (site) => (
                            <option key={site} value={site} />
                          ),
                        )}
                      </datalist>
                    </label>
                    <label {...stylex.props(ui.label)}>
                      站點難度（0.5–2，留空為未校準）
                      <input
                        {...stylex.props(ui.field, ui.formField)}
                        aria-label="匯入站點難度"
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.05"
                        placeholder="中性值 1.0（未校準）"
                        value={contest.difficulty ?? ""}
                        onChange={(e) =>
                          setContest({
                            ...contest,
                            difficulty:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label {...stylex.props(ui.label)}>
                      資料狀態
                      <select
                        {...stylex.props(ui.field, ui.select, ui.formField)}
                        value={contest.status ?? "final"}
                        onChange={(e) =>
                          setContest({
                            ...contest,
                            status: e.target.value as Contest["status"],
                          })
                        }
                      >
                        <option value="final">最終成績</option>
                        <option value="preliminary">暫定成績</option>
                      </select>
                    </label>
                    <label {...stylex.props(ui.label)}>
                      來源網址
                      <input
                        {...stylex.props(ui.field, ui.formField)}
                        type="url"
                        value={contest.source}
                        onChange={(e) =>
                          setContest({ ...contest, source: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  {warnings.map((w) => (
                    <p key={w} {...stylex.props(ui.paragraph, ui.notice)}>
                      {w}
                    </p>
                  ))}
                  <div {...stylex.props(ui.sectionHeading)}>
                    <h3 {...stylex.props(ui.subheading)}>匯入預覽</h3>
                    <span>
                      {contest.results.length} 隊 · {contest.problemCount} 題
                    </span>
                  </div>
                  <div {...stylex.props(tables.preview, tables.scroll)}>
                    <FixedTable
                      widths={[235, 158, 58, 92, 74]}
                      flexibleColumn={0}
                    >
                      <thead>
                        <tr>
                          <th
                            {...stylex.props(tables.head, tables.previewHead)}
                          >
                            隊名
                          </th>
                          <th
                            {...stylex.props(tables.head, tables.previewHead)}
                          >
                            國別
                          </th>
                          <th
                            {...stylex.props(tables.head, tables.previewHead)}
                          >
                            AC
                          </th>
                          <th
                            {...stylex.props(tables.head, tables.previewHead)}
                          >
                            Penalty
                          </th>
                          <th
                            {...stylex.props(tables.head, tables.previewHead)}
                          >
                            Dirty
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {contest.results.map((r, i) => (
                          <tr {...stylex.props(tables.row)} key={i}>
                            <td {...stylex.props(tables.cell)}>
                              <strong
                                {...stylex.props(tables.ellipsis)}
                                title={r.team}
                              >
                                {r.team}
                              </strong>
                              <small
                                {...stylex.props(
                                  tables.cellSmall,
                                  tables.ellipsis,
                                )}
                                title={r.affiliation}
                              >
                                {r.affiliation}
                              </small>
                            </td>
                            <td {...stylex.props(tables.cell)}>
                              <CountrySelect
                                value={r.country}
                                onChange={(country) =>
                                  setContest({
                                    ...contest,
                                    results: contest.results.map((v, j) =>
                                      i === j ? { ...v, country } : v,
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td {...stylex.props(tables.cell)}>{r.solved}</td>
                            <td {...stylex.props(tables.cell)}>{r.penalty}</td>
                            <td {...stylex.props(tables.cell)}>
                              {pct(dirtyRatio(r))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </FixedTable>
                  </div>
                </>
              )
            )}
            <footer {...stylex.props(panels.modalFooter)}>
              <button
                {...stylex.props(ui.button)}
                type="button"
                onClick={() => {
                  setContest(null);
                  setBackup(null);
                }}
              >
                返回
              </button>
              <button {...stylex.props(ui.button, ui.primary)} type="submit">
                {backup
                  ? "確認取代全部資料"
                  : replacing
                    ? "取代此場比賽"
                    : "確認加入排行"}{" "}
                <Icon name="check" size={16} />
              </button>
            </footer>
          </form>
        )}
        {error && (
          <p role="alert" {...stylex.props(ui.paragraph, ui.error)}>
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
