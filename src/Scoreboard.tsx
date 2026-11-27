import FixedTable from "./FixedTable";
import * as stylex from "@stylexjs/stylex";
import { ui } from "./styles/ui";
import { countryTint, tables } from "./styles/tables";
import { useMemo, useRef } from "react";
import { canonicalResult } from "../shared/ranking";
import Pagination, { usePagination } from "./Pagination";
import type { ScoreboardProps } from "./ContestScoreboard";

export default function Scoreboard({
  contest,
  aliases,
  onSelect,
}: ScoreboardProps) {
  // Sort only the expanded contest, and create cells only for its current page.
  const results = useMemo(
    () =>
      [...contest.results].sort(
        (a, b) => b.solved - a.solved || a.penalty - b.penalty,
      ),
    [contest.results],
  );
  const resultsRef = useRef<HTMLDivElement>(null);
  const pagination = usePagination(results.length);
  const problems = Array.from({ length: contest.problemCount }, (_, i) =>
    String.fromCharCode(65 + i),
  );
  return (
    <div>
      <p {...stylex.props(tables.swipeHint)}>左右滑動查看各題</p>
      <div {...stylex.props(tables.scroll)} ref={resultsRef}>
        <FixedTable
          widths={[56, 222, 58, 84, ...problems.map(() => 68)]}
          flexibleColumn={1}
          label={`${contest.name}逐題記分板`}
        >
          <thead>
            <tr>
              <th
                {...stylex.props(tables.head, tables.scoreboardCell)}
                scope="col"
              >
                #
              </th>
              <th
                {...stylex.props(
                  tables.head,
                  tables.scoreboardCell,
                  tables.scoreboardTeam,
                )}
                scope="col"
              >
                隊伍
              </th>
              <th
                {...stylex.props(tables.head, tables.scoreboardCell)}
                scope="col"
              >
                AC
              </th>
              <th
                {...stylex.props(tables.head, tables.scoreboardCell)}
                scope="col"
              >
                Penalty
              </th>
              {problems.map((label) => (
                <th
                  {...stylex.props(tables.head, tables.scoreboardCell)}
                  scope="col"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.slice(pagination.start, pagination.end).map((r) => (
              <tr
                key={`${r.team}-${r.affiliation}-${r.country}`}
                {...stylex.props(tables.row, countryTint(r.country))}
                data-country={r.country}
              >
                <td {...stylex.props(tables.cell, tables.scoreboardCell)}>
                  {r.rank}
                </td>
                <td
                  {...stylex.props(
                    tables.cell,
                    tables.scoreboardCell,
                    tables.scoreboardTeam,
                  )}
                >
                  <button
                    {...stylex.props(
                      ui.button,
                      ui.textButton,
                      tables.teamButton,
                    )}
                    onClick={() => onSelect(canonicalResult(r, aliases))}
                    title={r.team}
                  >
                    {r.team}
                  </button>
                  {r.sourceGroup && (
                    <small
                      {...stylex.props(tables.cellSmall, tables.ellipsis)}
                      title={r.sourceGroup}
                    >
                      {r.sourceGroup}
                    </small>
                  )}
                </td>
                <td {...stylex.props(tables.cell, tables.scoreboardCell)}>
                  {r.solved}
                </td>
                <td {...stylex.props(tables.cell, tables.scoreboardCell)}>
                  {r.penalty}
                </td>
                {problems.map((label, j) => {
                  const p = r.problems[j];
                  return (
                    <td
                      key={label}
                      {...stylex.props(
                        tables.cell,
                        tables.scoreboardCell,
                        p?.solved
                          ? tables.positive
                          : p?.attempts
                            ? tables.negative
                            : null,
                      )}
                      title={
                        p?.solved
                          ? "Accepted"
                          : p?.attempts
                            ? "未通過"
                            : "未提交"
                      }
                    >
                      {p?.solved ? `${p.time ?? "AC"}` : p?.attempts ? "−" : ""}
                      <small {...stylex.props(tables.cellSmall)}>
                        {p?.attempts ? `${p.attempts} tries` : ""}
                      </small>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </FixedTable>
      </div>
      {!results.length && (
        <p {...stylex.props(ui.paragraph, ui.empty)}>此場比賽尚無隊伍成績。</p>
      )}
      <Pagination
        pagination={pagination}
        resultsRef={resultsRef}
        label={contest.name + "記分板"}
        unit="隊"
      />
    </div>
  );
}
