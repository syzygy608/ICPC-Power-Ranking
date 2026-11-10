import { describe, expect, test } from "bun:test";
import seed from "../src/data/rankings.json";
import {
  defaults,
  type Contest,
  type Dataset,
  type Result,
} from "../shared/types";
import {
  canonical,
  canonicalResult,
  dirtyRatio,
  performance,
  rankTeams,
} from "../shared/ranking";
import { upsertContest } from "../shared/data";
import { validateDataset } from "../shared/validation";
const row = (
  team: string,
  solved = 1,
  penalty = 10,
  attempts: number | null = 1,
): Result => ({
  team,
  solved,
  penalty,
  affiliation: "School",
  country: "TW",
  rank: 1,
  problems: Array.from({ length: Math.max(1, solved) }, (_, i) => ({
    label: String.fromCharCode(65 + i),
    solved: solved > 0,
    attempts: solved ? attempts : 0,
    time: solved ? 10 : null,
  })),
});
const contest = (results: Result[], extra: Partial<Contest> = {}): Contest => ({
  id: "a",
  name: "Contest",
  date: "2026-11-05",
  site: "Site A",
  difficulty: null,
  source: "",
  problemCount: 1,
  results,
  ...extra,
});
const dataset = (contests: Contest[]): Dataset => ({
  version: 4,
  contests,
  aliases: {},
  countries: {},
  settings: { ...defaults },
});
test("dirty ratio counts only AC problems, with unknown and zero solve explicit", () => {
  const a = row("a", 1, 10, 2);
  a.problems.push({ label: "B", solved: false, time: null, attempts: 100 });
  expect(dirtyRatio(a)).toBe(1);
  expect(dirtyRatio(row("b", 0))).toBeNull();
  expect(dirtyRatio(row("b", 1, 10, null))).toBeNull();
});
test("relative level uses full-field ICPC placement, squared; ties share midrank", () => {
  const a = row("a"),
    b = row("b"),
    c = contest([a, b]);
  expect(performance(c, a).placementPercentile).toBe(0.5);
  expect(performance(c, a).percentile).toBeCloseTo(0.55);
  expect(performance(c, a).level).toBeCloseTo(0.55 ** 2);
  expect(performance(c, b).level).toBeCloseTo(0.55 ** 2);
  const foreign = { ...row("foreign", 1, 1), country: "OTHER" as const };
  expect(performance(contest([a, foreign]), a).placementPercentile).toBe(0);
  expect(performance(contest([a, foreign]), a).level).toBeCloseTo(0.01);
});
test("zero solves never gain clean performance, even in an all-zero contest", () => {
  const a = row("a", 0),
    b = row("b", 0),
    c = contest([a, b]);
  expect(performance(c, a).level).toBe(0);
  expect(performance(c, a).difficultyLevel).toBe(0);
  expect(rankTeams(dataset([c]))[0].rating).toBe(0);
});
test("unknown dirty uses neutral 50%, never a perfect clean score", () => {
  const a = row("known"),
    b = row("unknown", 1, 10, null);
  const c = contest([a, b]);
  expect(performance(c, b).percentile).toBeCloseTo(0.5);
  expect(performance(c, a).level).toBeGreaterThan(performance(c, b).level);
  const t = rankTeams(dataset([c])).find((t) => t.team === "unknown")!;
  expect(t.knownDirtyCount).toBe(0);
  expect(t.confidence).toBe(0);
});
test("lower dirty improves score at equal competitive level", () => {
  const c = contest([row("clean"), row("dirty", 1, 10, 3)]);
  const ranked = rankTeams(dataset([c]));
  expect(ranked[0].team).toBe("clean");
  expect(ranked[0].rating).toBeGreaterThan(ranked[1].rating);
});
test("dirty cannot reverse different solve counts, even against many clean peers", () => {
  const rows = [
    row("more", 3, 9999, 3),
    ...Array.from({ length: 100 }, (_, i) => row(`less-${i}`, 2, i, 1)),
  ];
  const c = contest(rows, { problemCount: 3 });
  const more = performance(c, rows[0]);
  for (const r of rows.slice(1))
    expect(more.level).toBeGreaterThan(performance(c, r).level);
  // No same-solve peer means no cleanliness adjustment at all.
  expect(more.percentile).toBe(more.placementPercentile);
});
test("the dirty adjustment remains within each solve band's percentile interval", () => {
  const rows = Array.from({ length: 30 }, (_, i) =>
    row(`team-${i}`, 1 + Math.floor(i / 6), i % 3, i % 2 ? 3 : 1),
  );
  const c = contest(rows, { problemCount: 5 });
  const d = dataset([c]);
  for (const a of rows) {
    const score = performance(c, a);
    const higher = rows.filter((b) => b.solved > a.solved).length;
    const count = rows.filter((b) => b.solved === a.solved).length;
    expect(score.percentile).toBeGreaterThanOrEqual(
      1 - (higher + count - 1) / (rows.length - 1),
    );
    expect(score.percentile).toBeLessThanOrEqual(
      1 - higher / (rows.length - 1),
    );
    // Optimized whole-ranking path must agree with the standalone calculation.
    expect(
      rankTeams(d).find((t) => t.team === a.team)!.history[0].score,
    ).toEqual(score);
    for (const b of rows.filter((b) => b.solved < a.solved))
      expect(score.level).toBeGreaterThan(performance(c, b).level);
  }
});
test("dirty has no effect when every positive solve count is unique", () => {
  const rows = [row("top", 3), row("middle", 2), row("last", 1)];
  const c = contest(rows, { problemCount: 3 });
  const before = rankTeams(dataset([c]));
  const changed = structuredClone(c);
  for (const r of changed.results) r.problems = [];
  const after = rankTeams(dataset([changed]));
  expect(after.map((t) => t.rating)).toEqual(before.map((t) => t.rating));
});
test("a single station gains no cross-station stability points", () => {
  const t = rankTeams(dataset([contest([row("a"), row("b", 1, 20)])]))[0];
  expect(t.siteCount).toBe(1);
  expect(t.stability).toBe(0);
  expect(t.stabilityContribution).toBe(0);
  expect(t.rating).toBe(72.5);
});
test("two consistent top finishes receive 65/20/15 contributions with neutral difficulty", () => {
  const a = contest([row("a"), row("b", 1, 20)]);
  const b = { ...structuredClone(a), id: "b", site: "Site B" };
  const t = rankTeams(dataset([a, b]))[0];
  expect(t.performanceContribution).toBe(65);
  expect(t.stabilityContribution).toBe(20);
  expect(t.difficultyContribution).toBe(7.5);
  expect(t.rating).toBe(92.5);
});
test("with two stations, stability equals the weaker station level", () => {
  const a = contest([
    row("A", 1, 10),
    row("B", 1, 20),
    row("C", 1, 30),
    row("D", 1, 40),
    row("E", 1, 50),
  ]);
  const b = contest(
    [
      row("E", 1, 10),
      row("B", 1, 20),
      row("C", 1, 30),
      row("D", 1, 40),
      row("A", 1, 50),
    ],
    { id: "b", site: "Site B" },
  );
  const ranked = rankTeams(dataset([a, b]));
  for (const t of ranked)
    expect(t.stability).toBeCloseTo(
      Math.min(...t.stations.map((s) => s.level)),
      12,
    );
  expect(ranked.find((t) => t.team === "B")!.stability).toBeGreaterThan(
    ranked.find((t) => t.team === "A")!.stability,
  );
});
test("being consistently last does not count as strong stability", () => {
  const a = contest([row("top"), row("last", 1, 20, 3)]);
  const b = { ...structuredClone(a), id: "b", site: "Site B" };
  const t = rankTeams(dataset([a, b])).find((t) => t.team === "last")!;
  expect(t.stability).toBe(0);
  expect(t.rating).toBe(0);
});
test("a low-ranked clean team cannot beat a strong multi-station team solely on dirty", () => {
  const a = contest([row("strong", 1, 10, 3), row("weak", 1, 20, 1)]);
  const b = { ...structuredClone(a), id: "b", site: "Site B" };
  const t = rankTeams(dataset([a, b]));
  expect(t[0].team).toBe("strong");
  expect(t[0].rating).toBeCloseTo(74.925);
});
test("repeating one station does not add station votes or unlock cross-station points", () => {
  const a = contest([row("a"), row("b", 1, 20)]);
  const d = dataset([a]);
  const before = rankTeams(d)[0];
  d.contests.push({ ...structuredClone(a), id: "repeat", site: "  SITE A " });
  const after = rankTeams(d)[0];
  expect(after.siteCount).toBe(1);
  expect(after.rating).toBe(before.rating);
  expect(after.count).toBe(2);
});
test("stations have equal influence regardless of their contest counts", () => {
  const a = contest([row("a"), row("b", 1, 20)]);
  const b = contest([row("b"), row("a", 1, 20)], { id: "b", site: "Site B" });
  const d = dataset([a, b]);
  const before = rankTeams(d).find((t) => t.team === "a")!;
  d.contests.push({ ...structuredClone(a), id: "repeat" });
  const after = rankTeams(d).find((t) => t.team === "a")!;
  expect(after.level).toBe(before.level);
  expect(after.stability).toBe(before.stability);
  expect(after.rating).toBe(before.rating);
});
test("changing core weights changes only their complementary contribution", () => {
  const d = dataset([contest([row("a"), row("b", 1, 20)])]);
  d.settings.performanceWeight = 70;
  d.settings.stabilityWeight = 20;
  expect(rankTeams(d)[0].rating).toBe(75);
  d.settings.performanceWeight = 0;
  expect(rankTeams(d)[0].rating).toBe(40);
});
test("dates and old scale, weight and prior fields no longer affect scores", () => {
  const d = dataset([contest([row("a"), row("b", 1, 20)])]);
  const expected = rankTeams(d)[0].rating;
  const raw = JSON.parse(JSON.stringify(d));
  raw.version = 1;
  raw.settings = { dirtyPenalty: 999, halfLife: 1, priorWeight: 999 };
  raw.contests[0] = {
    ...raw.contests[0],
    strength: 999,
    weight: 999,
    siteStats: { teams: 1e6 },
    date: "2000-01-01",
  };
  const migrated = validateDataset(raw);
  expect(rankTeams(migrated)[0].rating).toBe(expected);
  expect(migrated.version).toBe(4);
  expect(migrated.settings).toEqual({
    performanceWeight: 65,
    stabilityWeight: 20,
  });
  expect(migrated.contests[0]).not.toHaveProperty("siteStats");
  expect(migrated.contests[0]).not.toHaveProperty("weight");
});
test("migration preserves aliases, country overrides and all contest results without mutating input", () => {
  const raw = JSON.parse(JSON.stringify(dataset([contest([row("old")])])));
  raw.version = 1;
  raw.settings = {};
  raw.aliases = { old: "new" };
  raw.countries = { new: "OTHER" };
  raw.contests[0].weight = 3;
  const migrated = validateDataset(raw);
  expect(migrated.contests[0].results).toEqual(raw.contests[0].results);
  expect(migrated.aliases).toEqual(raw.aliases);
  expect(migrated.countries).toEqual(raw.countries);
  expect(raw.version).toBe(1);
  expect(raw.contests[0].weight).toBe(3);
});
test("contest input order is irrelevant", () => {
  const a = contest([row("a"), row("b", 1, 20)]);
  const b = contest([row("b"), row("a", 1, 20)], { id: "b", site: "Site B" });
  expect(rankTeams(dataset([a, b])).map((t) => t.rating)).toEqual(
    rankTeams(dataset([b, a])).map((t) => t.rating),
  );
});
test("aliases merge histories and same-contest duplicates are rejected", () => {
  const d = dataset([
    contest([row("old")]),
    contest([row("new")], { id: "b", site: "Site B" }),
  ]);
  d.aliases.old = "new";
  expect(rankTeams(validateDataset(d))).toHaveLength(1);
  d.contests[0].results.push(row("new"));
  expect(() => validateDataset(d)).toThrow("重複隊名");
});
test("identical display names from different schools or countries stay separate", () => {
  const taiwan = { ...row("Phoenix"), affiliation: "National Taiwan University", country: "TW" } as Result;
  const japan = { ...row("Phoenix", 1, 20), affiliation: "University of Tokyo", country: "JP" } as Result;
  const ranked = rankTeams(dataset([contest([taiwan, japan])]));
  expect(ranked).toHaveLength(2);
  expect(new Set(ranked.map((t) => t.id)).size).toBe(2);
  expect(canonicalResult(taiwan, {})).not.toBe(canonicalResult(japan, {}));
});
test("single-country legacy imports upgrade generic foreign labels", () => {
  const d = dataset([contest([{ ...row("Seoul"), country: "OTHER" }], {
    name: "ICPC Korea Preliminary", site: "Korea", source: "https://icpckorea.net/scoreboard",
  })]);
  expect(validateDataset(d).contests[0].results[0].country).toBe("KR");
});
test("alias cycles and inherited keys are handled safely", () => {
  expect(() => canonical("a", { a: "b", b: "a" })).toThrow("循環");
  expect(canonical("constructor", {})).toBe("constructor");
  expect(rankTeams(dataset([contest([row("constructor")])]))[0].country).toBe(
    "TW",
  );
});
test("invalid settings and dates fail before replacing data", () => {
  const d = dataset([contest([row("a")])]);
  d.contests[0].date = "2026-02-30";
  expect(() => validateDataset(d)).toThrow("日期");
  d.contests[0].date = "2026-11-05";
  d.settings.performanceWeight = NaN;
  expect(() => validateDataset(d)).toThrow("權重");
});
describe("published data integrity", () => {
  const d = validateDataset(seed);
  test("TOPC is imported once as final, with all teams", () => {
    const matches = d.contests.filter((c) => c.id === "topc-2026");
    expect(matches).toHaveLength(1);
    expect(matches[0].status).toBe("final");
    expect(matches[0].results).toHaveLength(178);
    expect(matches[0].problemCount).toBe(12);
  });
  test("TOPC agrees with every published problem solve total", () => {
    const c = d.contests.find((c) => c.id === "topc-2026")!;
    expect(c.results.reduce((s, r) => s + r.solved, 0)).toBe(635);
    expect(
      Array.from(
        { length: 12 },
        (_, i) => c.results.filter((r) => r.problems[i].solved).length,
      ),
    ).toEqual([175, 175, 12, 6, 55, 61, 17, 3, 1, 123, 0, 7]);
  });
  test("all stored totals agree with the 20-minute ICPC penalty rule", () => {
    for (const c of d.contests)
      for (const r of c.results)
        expect(
          r.problems
            .filter((p) => p.solved)
            .reduce((s, p) => s + p.time! + 20 * (p.attempts! - 1), 0),
        ).toBe(r.penalty);
  });
  test("NCPC retains all 114 teams and official solve totals", () => {
    const c = d.contests.find((c) => c.id === "ncpc-2026-final")!;
    expect(c.results).toHaveLength(114);
    expect(c.results.reduce((s, r) => s + r.solved, 0)).toBe(250);
    expect(
      Array.from(
        { length: 14 },
        (_, i) => c.results.filter((r) => r.problems[i].solved).length,
      ),
    ).toEqual([102, 62, 20, 28, 0, 8, 0, 8, 2, 19, 0, 0, 0, 1]);
  });
  test("same team name combines TOPC and NCPC histories", () => {
    const yaju = rankTeams(d).find((t) => t.team === "YajuKingFlag")!;
    expect(yaju.count).toBe(2);
    expect(yaju.history.map((h) => h.result.solved)).toEqual([8, 10]);
    expect(
      yaju.history.find((h) => h.contest.id === "topc-2026")!.score.dirty,
    ).toBe(0.1);
  });
});

test("reimporting a contest ID replaces rather than duplicates its history", () => {
  const original = contest([row("a")]);
  const d = dataset([original]);
  const next = upsertContest(d, {
    ...original,
    name: "Updated",
    results: [row("a", 1, 30)],
  });
  expect(next.contests).toHaveLength(1);
  expect(next.contests[0].name).toBe("Updated");
  expect(rankTeams(next)[0].count).toBe(1);
  expect(d.contests[0].name).toBe("Contest");
});

test("a harder station improves scores at equal percentile, dirty and consistency", () => {
  const normal = dataset([contest([row("a"), row("b", 1, 20)])]);
  const hard = structuredClone(normal);
  hard.contests[0].difficulty = 2;
  expect(rankTeams(hard)[0].rating - rankTeams(normal)[0].rating).toBe(7.5);
  expect(rankTeams(hard)[0].level).toBe(rankTeams(normal)[0].level);
  expect(rankTeams(hard)[0].difficultyContribution).toBe(15);
});
test("difficulty alone cannot reward zero solves or last-place performance", () => {
  const d = dataset([contest([row("top"), row("zero", 0)], { difficulty: 2 })]);
  const t = rankTeams(d).find((t) => t.team === "zero")!;
  expect(t.rating).toBe(0);
  expect(t.difficultyContribution).toBe(0);
});
test("unrated difficulty stays neutral and is shown as uncalibrated", () => {
  const d = dataset([contest([row("a"), row("b", 1, 20)])]);
  const t = rankTeams(d)[0];
  expect(t.knownDifficultyCount).toBe(0);
  expect(t.history[0].score.difficulty).toBe(1);
});
test("difficulty and total weighting ranges are validated", () => {
  const d = dataset([contest([row("a")], { difficulty: 3 })]);
  expect(() => validateDataset(d)).toThrow("難度");
  d.contests[0].difficulty = null;
  d.settings.performanceWeight = 70;
  d.settings.stabilityWeight = 40;
  expect(() => validateDataset(d)).toThrow("權重");
});

test("v2 drafts migrate to three-factor weights and retain contest history", () => {
  const raw = JSON.parse(JSON.stringify(dataset([contest([row("a")])])));
  raw.version = 2;
  raw.settings = { performanceWeight: 55 };
  delete raw.contests[0].difficulty;
  const migrated = validateDataset(raw);
  expect(migrated.version).toBe(4);
  expect(migrated.settings).toEqual({
    performanceWeight: 65,
    stabilityWeight: 20,
  });
  expect(migrated.contests[0].difficulty).toBeNull();
  expect(migrated.contests[0].results).toEqual(raw.contests[0].results);
});

test("v3 drafts adopt performance-first settings and discard retired roster data", () => {
  const raw = {
    ...structuredClone(seed),
    version: 3,
    settings: { cleanWeight: 35, stabilityWeight: 40 },
    yunlinTeams: ["old roster"],
  };
  const next = validateDataset(raw);
  expect(next.version).toBe(4);
  expect(next.settings).toEqual(defaults);
  expect(next).not.toHaveProperty("yunlinTeams");
  expect(next.contests).toHaveLength(raw.contests.length);
  expect(next.contests[0]).toEqual(raw.contests[0]);
  expect(next.contests.at(-1)!.results.every((r) => r.country === "KR")).toBe(true);
  expect(next.aliases).toEqual(raw.aliases);
  expect(next.countries).toEqual(raw.countries);
  expect(raw).toHaveProperty("yunlinTeams");
});
