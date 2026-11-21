import { useMemo } from "react";
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
    () => [...contest.results].sort(
      (a, b) => b.solved - a.solved || a.penalty - b.penalty,
    ),
    [contest.results],
  );
  const pagination = usePagination(results.length);
  const problems = Array.from(
    { length: contest.problemCount },
    (_, i) => String.fromCharCode(65 + i),
  );
  return (
    <div>
      <div className="table-scroll">
        <table className="scoreboard" aria-label={`${contest.name}逐題記分板`}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">隊伍</th>
              <th scope="col">AC</th>
              <th scope="col">Penalty</th>
              {problems.map((label) => <th scope="col" key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {results.slice(pagination.start, pagination.end).map((r) => (
              <tr
                key={`${r.team}-${r.affiliation}-${r.country}`}
                className="country-tint"
                data-country={r.country}
              >
                <td>{r.rank}</td>
                <td>
                  <button
                    className="team-button"
                    onClick={() => onSelect(canonicalResult(r, aliases))}
                  >
                    {r.team}
                  </button>
                  {r.sourceGroup && <small>{r.sourceGroup}</small>}
                </td>
                <td>{r.solved}</td>
                <td>{r.penalty}</td>
                {problems.map((label, j) => {
                  const p = r.problems[j];
                  return (
                    <td
                      key={label}
                      className={p?.solved ? "ac" : p?.attempts ? "wa" : ""}
                      title={p?.solved ? "Accepted" : p?.attempts ? "未通過" : "未提交"}
                    >
                      {p?.solved ? `${p.time ?? "AC"}` : p?.attempts ? "−" : ""}
                      <small>{p?.attempts ? `${p.attempts} tries` : ""}</small>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!results.length && <p className="empty">此場比賽尚無隊伍成績。</p>}
      <Pagination pagination={pagination} label={contest.name + "記分板"} unit="隊" />
    </div>
  );
}
