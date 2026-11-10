import { expect, test } from "bun:test";
import { selectTaiwanHighlights, schoolKey } from "../shared/highlights";
import { rankSchools } from "../shared/schools";
import { rankTeams, canonicalResult } from "../shared/ranking";
import { validateDataset } from "../shared/validation";
import seed from "../src/data";
const team = (name: string, school: string, country = "TW") => ({
  team: name,
  affiliation: school,
  country,
});
test("select ten Taiwanese teams, cap two per university and fill skipped positions", () => {
  const all = [
    team("a1", "A"),
    team("foreign", "Z", "OTHER"),
    team("unknown", "Z", "UNKNOWN"),
    team("missing", ""),
    team("a2", "A"),
    team("a3", "A"),
    ...Array.from({ length: 15 }, (_, i) => team(`other-${i}`, `school-${i}`)),
  ];
  const picks = selectTaiwanHighlights(all);
  expect(picks).toHaveLength(10);
  expect(picks.slice(0, 3).map((t) => t.team)).toEqual(["a1", "a2", "other-0"]);
  expect(picks.at(-1)!.team).toBe("other-7");
});
test("school normalization prevents variant names bypassing the cap", () => {
  expect(
    selectTaiwanHighlights([
      team("a", "國立台灣大學"),
      team("b", " 國立臺灣大學 "),
      team("c", "國立臺灣大學"),
    ]),
  ).toHaveLength(2);
  expect(schoolKey("  SCHOOL   A ")).toBe(schoolKey("school a"));
});
test("insufficient eligible schools return fewer teams, with no repeated teams", () => {
  expect(
    selectTaiwanHighlights([
      team("a", "A"),
      team("a", "A"),
      team("b", "A"),
      team("c", "A"),
    ]).map((t) => t.team),
  ).toEqual(["a", "b"]);
});
test("published watchlist selects ten without altering the full ranking", () => {
  const d = validateDataset(seed),
    ranked = rankTeams(d),
    before = ranked.map((t) => t.team),
    picks = selectTaiwanHighlights(ranked);
  expect(picks).toHaveLength(10);
  expect(ranked.map((t) => t.team)).toEqual(before);
  expect(ranked.length).toBe(
    new Set(
      d.contests.flatMap((c) =>
        c.results.map((r) => canonicalResult(r, d.aliases)),
      ),
    ).size,
  );
  for (const school of new Set(picks.map((t) => schoolKey(t.affiliation))))
    expect(
      picks.filter((t) => schoolKey(t.affiliation) === school).length,
    ).toBeLessThanOrEqual(2);
});
test("school index uses the top six mean and both extremes, excluding lower entrants", () => {
  const base = rankTeams(validateDataset(seed))[0];
  const teams = [90, 80, 70, 60, 50, 40, 0].map((rating, i) => ({
    ...base,
    team: `team${i}`,
    affiliation: "School A",
    country: "TW" as const,
    rating,
  }));
  const school = rankSchools(teams)[0];
  expect(school.scoringTeams).toHaveLength(6);
  expect(school.teams).toHaveLength(7);
  expect(school.average).toBe(65);
  expect(school.maximum).toBe(90);
  expect(school.minimum).toBe(40);
  expect(school.index).toBeCloseTo(67.5, 10);
  expect(school.scoringTeams.map((t) => t.team)).not.toContain("team6");
});
test("schools with fewer than six teams use available records without zero padding", () => {
  const base = rankTeams(validateDataset(seed))[0];
  const teams = [90, 70].map((rating, i) => ({
    ...base,
    team: `t${i}`,
    rating,
    affiliation: "School A",
  }));
  const school = rankSchools(teams)[0];
  expect(school.scoringTeams).toHaveLength(2);
  expect(school.average).toBe(80);
  expect(school.index).toBeCloseTo(81, 10);
  expect(rankSchools(teams.slice(0, 1))[0].index).toBe(90);
});
test("better highest, average or lowest scores improve a school index", () => {
  const base = rankTeams(validateDataset(seed))[0];
  const make = (ratings: number[]) =>
    rankSchools(
      ratings.map((rating, i) => ({
        ...base,
        team: `t${i}`,
        affiliation: "A",
        rating,
      })),
    )[0].index;
  const ratings = [90, 80, 70, 60, 50, 40];
  const baseline = make(ratings);
  expect(make([95, ...ratings.slice(1)])).toBeGreaterThan(baseline);
  expect(make([90, 80, 75, 60, 50, 40])).toBeGreaterThan(baseline);
  expect(make([90, 80, 70, 60, 50, 45])).toBeGreaterThan(baseline);
});
test("school rankings include foreign schools separately and merge normalized school names", () => {
  const base = rankTeams(validateDataset(seed)).slice(0, 4);
  const teams = base.map((t, i) => ({
    ...t,
    affiliation: ["國立台灣大學", " 國立臺灣大學 ", "Foreign", ""][i],
    country: i === 2 ? ("OTHER" as const) : ("TW" as const),
  }));
  const schools = rankSchools(teams);
  expect(schools).toHaveLength(2);
  expect(schools.find((s) => s.country === "TW")!.teams).toHaveLength(2);
  expect(schools.find((s) => s.country === "OTHER")!.school).toBe("Foreign");
});
test("school rankings update with changed team ratings", () => {
  const teams = rankTeams(validateDataset(seed));
  const before = rankSchools(teams);
  const target = before.at(-1)!.teams[0].team;
  const changed = teams.map((t) =>
    t.team === target ? { ...t, rating: 100 } : t,
  );
  const school = rankSchools(changed).find((s) =>
    s.teams.some((t) => t.team === target),
  )!;
  expect(school.scoringTeams[0].team).toBe(target);
  expect(school.index).toBeGreaterThan(
    before.find((s) => s.school === school.school)!.index,
  );
});
