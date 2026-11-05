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
  problems: [
    {
      label: "A",
      solved: solved > 0,
      attempts: solved ? attempts : 0,
      time: solved ? 10 : null,
    },
  ],
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
  version: 3,
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
  expect(performance(c, a).percentile).toBe(0.5);
  expect(performance(c, a).level).toBe(0.25);
  expect(performance(c, b).level).toBe(0.25);
  const foreign = { ...row("foreign", 1, 1), country: "OTHER" as const };
  expect(performance(contest([a, foreign]), a).level).toBe(0);
});
test("zero solves never gain clean performance, even in an all-zero contest", () => {
  const a = row("a", 0),
    b = row("b", 0),
    c = contest([a, b]);
  expect(performance(c, a).level).toBe(0);
  expect(performance(c, a).clean).toBe(0);
  expect(rankTeams(dataset([c]))[0].rating).toBe(0);
});
test("unknown dirty uses neutral 50%, never a perfect clean score", () => {
  const a = row("known"),
    b = row("unknown", 1, 10, null);
  const c = contest([a, b]);
  expect(performance(c, b).clean).toBe(performance(c, b).level * 0.5);
  expect(performance(c, a).clean).toBeGreaterThan(performance(c, b).clean);
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
test("a single station gains no cross-station stability points", () => {
  const t = rankTeams(dataset([contest([row("a"), row("b", 1, 20)])]))[0];
  expect(t.siteCount).toBe(1);
  expect(t.stability).toBe(0);
  expect(t.stabilityContribution).toBe(0);
  expect(t.rating).toBe(47.5);
});
test("two consistent top finishes receive 35/40/25 contributions with neutral difficulty", () => {
  const a = contest([row("a"), row("b", 1, 20)]);
  const b = { ...structuredClone(a), id: "b", site: "Site B" };
  const t = rankTeams(dataset([a, b]))[0];
  expect(t.cleanContribution).toBe(35);
  expect(t.stabilityContribution).toBe(40);
  expect(t.difficultyContribution).toBe(12.5);
  expect(t.rating).toBe(87.5);
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
  const a = contest([row("top"), row("last", 1, 20)]);
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
  expect(t[0].rating).toBe(52.5);
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
  expect(after.clean).toBe(before.clean);
  expect(after.stability).toBe(before.stability);
  expect(after.rating).toBe(before.rating);
});
test("changing core weights changes only their complementary contribution", () => {
  const d = dataset([contest([row("a"), row("b", 1, 20)])]);
  d.settings.cleanWeight = 70;
  d.settings.stabilityWeight = 20;
  expect(rankTeams(d)[0].rating).toBe(75);
  d.settings.cleanWeight = 0;
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
  expect(migrated.version).toBe(3);
  expect(migrated.settings).toEqual({ cleanWeight: 35, stabilityWeight: 40 });
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
  d.settings.cleanWeight = NaN;
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
  expect(rankTeams(hard)[0].rating - rankTeams(normal)[0].rating).toBe(12.5);
  expect(rankTeams(hard)[0].clean).toBe(rankTeams(normal)[0].clean);
  expect(rankTeams(hard)[0].difficultyContribution).toBe(25);
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
  d.settings.cleanWeight = 70;
  d.settings.stabilityWeight = 40;
  expect(() => validateDataset(d)).toThrow("權重");
});

test("v2 drafts migrate to three-factor weights and retain contest history", () => {
  const raw = JSON.parse(JSON.stringify(dataset([contest([row("a")])])));
  raw.version = 2;
  raw.settings = { cleanWeight: 55 };
  delete raw.contests[0].difficulty;
  const migrated = validateDataset(raw);
  expect(migrated.version).toBe(3);
  expect(migrated.settings).toEqual({ cleanWeight: 35, stabilityWeight: 40 });
  expect(migrated.contests[0].difficulty).toBeNull();
  expect(migrated.contests[0].results).toEqual(raw.contests[0].results);
});
