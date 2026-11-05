import { expect, test } from "bun:test";
import { parseScoreboard } from "../shared/parser";
// Reduced fixtures preserve the observed DOMjudge structures; scripts are deliberately untrusted.
const modern = `<html><title>Scoreboard topc - DOMjudge</title><body><p>preliminary results - not final</p><table class="scoreboard desktop-scoreboard"><tbody>
<tr data-team-name="YajuKingFlag"><td class="rank">1</td><td><img src="/flags/4x3/tw.svg" title="Taiwan" alt="TWN"></td><td class="scoretn" title="YajuKingFlag"><a><span class="forceWidth">YajuKingFlag</span><span class="univ forceWidth">National Taiwan University</span></a></td><td class="scorenc">2</td><td class="scorett">110</td><td class="score_cell"><a><div class="score_correct score_first">2<span>1 try</span></div></a></td><td class="score_cell"><a><div class="score_correct">88<span>2 tries</span></div></a></td><td class="score_cell"><a><div class="score_incorrect">&nbsp;<span>5 tries</span></div></a></td></tr>
<tr data-team-name="Zero"><td class="scoretn"><span>Zero</span><span class="univ">Unknown University</span></td><td class="scorenc">0</td><td class="scorett">0</td><td class="score_cell"></td><td class="score_cell"></td><td class="score_cell"></td></tr></tbody></table>
<table class="scoreboard mobile-scoreboard"><tr data-team-name="YajuKingFlag"><td class="scoretn">duplicate mobile rendering</td></tr></table><script>throw new Error('should never execute');</script></body></html>`;
test("modern DOMjudge parses nested AC classes, flags, names and attempts", () => {
  const p = parseScoreboard(modern);
  expect(p.results).toHaveLength(2);
  expect(p.problemCount).toBe(3);
  expect(p.results[0]).toMatchObject({
    team: "YajuKingFlag",
    affiliation: "National Taiwan University",
    country: "TW",
    solved: 2,
    penalty: 110,
  });
  expect(p.results[0].problems).toEqual([
    { label: "A", solved: true, time: 2, attempts: 1 },
    { label: "B", solved: true, time: 88, attempts: 2 },
    { label: "C", solved: false, time: null, attempts: 5 },
  ]);
  expect(p.results[1].country).toBe("UNKNOWN");
  expect(p.warnings.length).toBeGreaterThan(0);
});
test("legacy DOMjudge strips category and school without damaging team punctuation", () => {
  const html = `<table class="scoreboard"><tr><td class="scoreboard-teamname"><span class="badge">北區</span><span class="teamname">A &lt; B</span><small>國立成功大學</small></td><td class="scoreboard-score">1</td><td class="scoreboard-score">11</td><td class="score_cell score_correct">11 <span>1 try</span></td></tr></table>`;
  expect(parseScoreboard(html).results[0]).toMatchObject({
    team: "A < B",
    affiliation: "國立成功大學",
    country: "TW",
  });
});
test("foreign flag takes priority over school heuristics", () => {
  const html = modern
    .replace("/flags/4x3/tw.svg", "/flags/4x3/jp.svg")
    .replace('title="Taiwan" alt="TWN"', 'title="Japan" alt="JPN"')
    .replaceAll("National Taiwan University", "國立成功大學");
  expect(parseScoreboard(html).results[0].country).toBe("OTHER");
});
test("malformed scoreboards fail rather than silently dropping teams", () => {
  expect(() => parseScoreboard("<h1>Not a scoreboard</h1>")).toThrow("找不到");
  expect(() =>
    parseScoreboard(modern.replace('class="scorenc">2', 'class="scorenc">3')),
  ).toThrow("不符");
  expect(() =>
    parseScoreboard(modern.replace('class="scorenc">2', 'class="scorenc">')),
  ).toThrow("空白");
});
test("unavailable AC attempt counts remain unknown", () => {
  const html = modern.replace("88<span>2 tries</span>", "88");
  expect(parseScoreboard(html).results[0].problems[1].attempts).toBeNull();
});

test("blank rank cells retain the previous tied official rank", () => {
  const row = (name: string, rank: string) =>
    `<tr data-team-name="${name}"><td class="scorepl">${rank}</td><td class="scoretn">${name}</td><td class="scorenc">1</td><td class="scorett">10</td><td class="score_cell"><div class="score_correct">10 <span>1 try</span></div></td></tr>`;
  const results = parseScoreboard(
    `<table class="scoreboard">${row("A", "1")}${row("B", "")}</table>`,
  ).results;
  expect(results.map((r) => r.rank)).toEqual([1, 1]);
});
