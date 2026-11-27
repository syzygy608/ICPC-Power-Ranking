import FixedTable from "./FixedTable";
import * as stylex from "@stylexjs/stylex";
import { ui } from "./styles/ui";
import { ranking } from "./styles/ranking";
import { panels } from "./styles/panels";
import { countryTint, tables } from "./styles/tables";
import { useMemo, useState } from "react";
import { rankSchools } from "../shared/schools";
import type { RankedTeam } from "../shared/ranking";
import { countryLabel } from "../shared/types";
import Icon from "./Icons";
import Pagination, { usePagination } from "./Pagination";
export default function Schools({
  teams,
  onSelect,
}: {
  teams: RankedTeam[];
  onSelect: (team: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");
  const schools = useMemo(() => rankSchools(teams), [teams]);
  const filtered = schools.filter(
    (s) =>
      s.school.toLowerCase().includes(query.toLowerCase()) &&
      (country === "ALL" ||
        (country === "OTHER"
          ? s.country !== "TW" &&
            s.country !== "JP" &&
            s.country !== "KR" &&
            s.country !== "VN"
          : s.country === country)),
  );
  const pagination = usePagination(filtered.length);
  return (
    <section {...stylex.props(ui.panel)}>
      <div {...stylex.props(ui.panelHeading)}>
        <div>
          <h2 {...stylex.props(ui.heading)}>
            學校戰力指數排名{" "}
            <span {...stylex.props(ui.count)}>{schools.length}</span>
          </h2>
        </div>
        <Icon name="users" />
      </div>
      <div {...stylex.props(tables.toolbar)}>
        <label {...stylex.props(tables.search)}>
          <Icon name="search" size={18} />
          <input
            {...stylex.props(ui.field, tables.searchInput)}
            aria-label="搜尋學校戰力榜"
            placeholder="搜尋學校…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              pagination.setPage(1);
            }}
          />
        </label>
        <select
          {...stylex.props(ui.field, ui.select, tables.filter)}
          aria-label="篩選學校國別"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            pagination.setPage(1);
          }}
        >
          <option value="ALL">所有國家</option>
          <option value="TW">台灣</option>
          <option value="KR">韓國</option>
          <option value="JP">日本</option>
          <option value="VN">越南</option>
          <option value="OTHER">其他國家</option>
          {/*<option value="UNKNOWN">待確認</option>*/}
        </select>
        <button
          {...stylex.props(ui.button, tables.clearFilters)}
          disabled={!query && country === "ALL"}
          onClick={() => {
            setQuery("");
            setCountry("ALL");
            pagination.setPage(1);
          }}
        >
          清除篩選
        </button>
      </div>
      <div {...stylex.props(tables.scroll)}>
        <FixedTable
          widths={[64, 230, 108, 156, 152, 108, 120]}
          flexibleColumn={1}
        >
          <thead>
            <tr>
              <th {...stylex.props(tables.head)}>排名</th>
              <th {...stylex.props(tables.head)}>學校</th>
              <th {...stylex.props(tables.head)}>學校戰力 ↓</th>
              <th {...stylex.props(tables.head)}>平均 / 最高 / 最低</th>
              <th {...stylex.props(tables.head)}>計分明細</th>
              <th {...stylex.props(tables.head)}>全校隊伍數</th>
              <th {...stylex.props(tables.head)}>主力參賽站數</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(pagination.start, pagination.end).map((s) => (
              <tr
                key={`${s.country}-${s.school}`}
                {...stylex.props(tables.row, countryTint(s.country))}
                data-country={s.country}
              >
                <td {...stylex.props(tables.cell, tables.rankNumber)}>
                  {String(s.rank).padStart(2, "0")}
                </td>
                <td {...stylex.props(tables.cell)}>
                  <strong {...stylex.props(tables.ellipsis)} title={s.school}>
                    {s.school}
                  </strong>
                  <small {...stylex.props(tables.cellSmall)}>
                    {countryLabel(s.country)}
                  </small>
                  {s.scoringTeams.length < 6 && (
                    <small {...stylex.props(tables.cellSmall)}>
                      計分 {s.scoringTeams.length} / 6 隊，資料未滿六隊
                    </small>
                  )}
                </td>
                <td {...stylex.props(tables.cell)}>
                  <strong {...stylex.props(tables.rating)}>
                    {s.index.toFixed(1)}
                  </strong>
                </td>
                <td {...stylex.props(tables.cell)}>
                  <strong>{s.average.toFixed(1)}</strong>
                  <small {...stylex.props(tables.cellSmall)}>
                    最高 {s.maximum.toFixed(1)} · 最低 {s.minimum.toFixed(1)}
                  </small>
                </td>
                <td {...stylex.props(tables.cell)}>
                  <details>
                    <summary {...stylex.props(ui.summary)}>
                      查看 {s.scoringTeams.length} 隊
                    </summary>
                    <div {...stylex.props(ranking.schoolTeams)}>
                      {s.scoringTeams.map((t) => (
                        <div {...stylex.props(ranking.schoolTeam)} key={t.id}>
                          <button
                            {...stylex.props(
                              ui.button,
                              ui.textButton,
                              tables.teamButton,
                            )}
                            onClick={() => onSelect(t.id)}
                            title={t.team}
                          >
                            {t.team}
                          </button>
                          <span {...stylex.props(panels.detailLabel)}>
                            {t.rating.toFixed(1)} 分 · {t.siteCount} 站
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </td>
                <td {...stylex.props(tables.cell)}>{s.teams.length} 隊</td>
                <td {...stylex.props(tables.cell)}>{s.siteCount} 站</td>
              </tr>
            ))}
          </tbody>
        </FixedTable>
        {!filtered.length && (
          <div {...stylex.props(ui.empty)}>
            <h3 {...stylex.props(ui.subheading)}>
              {schools.length ? "沒有符合條件的學校" : "尚無可排名的學校"}
            </h3>
            <p {...stylex.props(ui.paragraph)}>
              需要學校資料，才會納入學校戰力榜。
            </p>
            {(query || country !== "ALL") && (
              <button
                {...stylex.props(ui.button)}
                onClick={() => {
                  setQuery("");
                  setCountry("ALL");
                  pagination.setPage(1);
                }}
              >
                清除篩選
              </button>
            )}
          </div>
        )}
      </div>
      <Pagination pagination={pagination} label="學校戰力榜" unit="所學校" />
    </section>
  );
}
