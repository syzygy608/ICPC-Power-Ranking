import { useMemo, useState } from "react";
import { rankSchools } from "../shared/schools";
import type { RankedTeam } from "../shared/ranking";
import Icon from "./Icons";
export default function Schools({
  teams,
  onSelect,
}: {
  teams: RankedTeam[];
  onSelect: (team: string) => void;
}) {
  const [query, setQuery] = useState("");
  const schools = useMemo(() => rankSchools(teams), [teams]);
  const filtered = schools.filter((s) =>
    s.school.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="panel school-ranking">
      <div className="panel-heading">
        <div>
          <h2>
            學校戰力指數排名 <span className="count">{schools.length}</span>
          </h2>
          <p className="muted">
            各校最強六隊 · 平均 70% + 最高 20% + 最低 10% · 0–100 分
          </p>
        </div>
        <Icon name="users" />
      </div>
      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <input
            aria-label="搜尋學校戰力榜"
            placeholder="搜尋學校…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="clear-filters"
          disabled={!query}
          onClick={() => setQuery("")}
        >
          清除篩選
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>學校</th>
              <th>學校戰力 ↓</th>
              <th>平均 / 最高 / 最低</th>
              <th>計分明細</th>
              <th>全校隊伍數</th>
              <th>主力參賽站數</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.school}>
                <td className="rank-number">
                  {String(s.rank).padStart(2, "0")}
                </td>
                <td>
                  <strong>{s.school}</strong>
                  {s.scoringTeams.length < 6 && (
                    <small>
                      計分 {s.scoringTeams.length} / 6 隊，資料未滿六隊
                    </small>
                  )}
                </td>
                <td>
                  <strong className="rating">{s.index.toFixed(1)}</strong>
                </td>
                <td>
                  <strong>{s.average.toFixed(1)}</strong>
                  <small>
                    最高 {s.maximum.toFixed(1)} · 最低 {s.minimum.toFixed(1)}
                  </small>
                </td>
                <td>
                  <details className="school-team-details">
                    <summary>查看 {s.scoringTeams.length} 隊</summary>
                    <div className="school-teams">
                      {s.scoringTeams.map((t) => (
                        <div key={t.team}>
                          <button
                            className="team-button"
                            onClick={() => onSelect(t.team)}
                          >
                            {t.team}
                          </button>
                          <span>
                            {t.rating.toFixed(1)} 分 · {t.siteCount} 站
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </td>
                <td>{s.teams.length} 隊</td>
                <td>{s.siteCount} 站</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty">
            <h3>
              {schools.length ? "沒有符合條件的學校" : "尚無可排名的台灣學校"}
            </h3>
            <p>需要隊伍國別與學校資料，才會納入學校戰力榜。</p>
            {query && <button onClick={() => setQuery("")}>清除篩選</button>}
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>{filtered.length} 所學校</span>
        <span>不足六隊時按現有隊伍計算，不以零分補齊</span>
      </div>
    </section>
  );
}
