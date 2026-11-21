import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ContestScoreboard from "../src/ContestScoreboard";
import Scoreboard from "../src/Scoreboard";
import type { Contest } from "../shared/types";

function contest(): Contest {
  return {
    id: "large-contest", name: "Large Contest", date: "2026-11-21",
    site: "Taiwan", difficulty: null, problemCount: 2, source: "",
    results: Array.from({ length: 60 }, (_, i) => ({
      team: `Team-${String(i).padStart(3, "0")}`, affiliation: "School",
      country: "TW", rank: i + 1, solved: 1, penalty: i * 10,
      sourceGroup: i === 0 ? "University" : undefined,
      problems: [
        { label: "A", solved: true, attempts: 2, time: i * 10 },
        { label: "B", solved: false, attempts: 1, time: null },
      ],
    })),
  };
}

test("collapsed scoreboards do not read results or render any table cells", () => {
  const c = contest();
  Object.defineProperty(c, "results", {
    get() { throw new Error("Collapsed scoreboard must not access results"); },
  });
  const html = renderToStaticMarkup(
    <ContestScoreboard contest={c} aliases={{}} onSelect={() => {}} />,
  );
  expect(html).toContain("展開逐題記分板");
  expect(html).not.toContain("<table");
  expect(html).not.toContain("<td");
});

test("expanded scoreboards render only one page, retaining standings and problem details", () => {
  const c = contest();
  c.results.reverse();
  const original = [...c.results];
  const html = renderToStaticMarkup(
    <Scoreboard contest={c} aliases={{}} onSelect={() => {}} />,
  );
  expect(html.match(/<tr/g)?.length).toBe(26); // Header + 25 teams.
  expect(html).toContain("Team-000");
  expect(html).toContain("Team-024");
  expect(html).not.toContain("Team-025");
  expect(html).toContain("1–25 / 60 隊");
  expect(html).toContain("University");
  expect(html).toContain('class="ac" title="Accepted"');
  expect(html).toContain('class="wa" title="未通過"');
  expect(html).toContain("2 tries");
  expect(c.results).toEqual(original);
});

test("scoreboards handle contests without results", () => {
  const c = { ...contest(), results: [] };
  const html = renderToStaticMarkup(
    <Scoreboard contest={c} aliases={{}} onSelect={() => {}} />,
  );
  expect(html).toContain("此場比賽尚無隊伍成績");
  expect(html).toContain("0–0 / 0 隊");
});
