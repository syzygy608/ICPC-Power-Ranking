import { teamKey, type Dataset, type Contest, type Result } from "./types";
export function dirtyRatio(r: Result): number | null {
  const solved = r.problems.filter((p) => p.solved);
  if (
    !r.solved ||
    solved.length !== r.solved ||
    solved.some((p) => p.attempts === null)
  )
    return null;
  return solved.filter((p) => p.attempts! > 1).length / solved.length;
}
export function canonical(
  name: string,
  aliases: Record<string, string>,
): string {
  let key = teamKey(name);
  const seen = new Set<string>();
  while (Object.hasOwn(aliases, key)) {
    if (seen.has(key)) throw new Error("隊名別名不可形成循環");
    seen.add(key);
    key = teamKey(aliases[key]);
  }
  return key;
}
export function stationKey(name: string) {
  return teamKey(name).toLocaleLowerCase("en-US");
}
const mean = (values: number[]) =>
  values.reduce((s, n) => s + n, 0) / values.length;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function performance(
  c: Contest,
  r: Result,
  knownPercentile?: number,
  knownGroup?: { higher: number; size: number },
) {
  const better =
    knownPercentile === undefined
      ? c.results.filter(
          (t) =>
            t.solved > r.solved ||
            (t.solved === r.solved && t.penalty < r.penalty),
        ).length
      : 0;
  const tied =
    knownPercentile === undefined
      ? c.results.filter(
          (t) => t.solved === r.solved && t.penalty === r.penalty,
        ).length
      : 0;
  const placementPercentile =
    knownPercentile ??
    (c.results.length < 2
      ? 0.5
      : 1 - (better + (tied - 1) / 2) / (c.results.length - 1));
  const dirty = dirtyRatio(r);
  const group = knownGroup ?? {
    higher: c.results.filter((t) => t.solved > r.solved).length,
    size: c.results.filter((t) => t.solved === r.solved).length,
  };
  // Both positions stay inside the same solve-count band's rank interval.
  // A 10% cleanliness adjustment can refine peers, never cross a solve-count boundary.
  const cleanlinessPercentile =
    c.results.length < 2
      ? 0.5
      : 1 -
        (group.higher + (group.size - 1) * (dirty ?? 0.5)) /
          (c.results.length - 1);
  const percentile =
    group.size > 1 && r.solved > 0
      ? clamp(0.9 * placementPercentile + 0.1 * cleanlinessPercentile)
      : placementPercentile;
  const level = r.solved === 0 ? 0 : clamp(percentile) ** 2;
  const difficulty = c.difficulty ?? 1;
  const difficultyLevel = (level * difficulty) / 2;
  return {
    placementPercentile,
    percentile,
    level,
    dirty,
    difficulty,
    difficultyLevel,
  };
}
export function rankTeams(data: Dataset) {
  const teams = new Map<
    string,
    {
      team: string;
      history: {
        contest: Contest;
        result: Result;
        score: ReturnType<typeof performance>;
      }[];
    }
  >();
  for (const c of data.contests) {
    const ordered = [...c.results].sort(
      (a, b) => b.solved - a.solved || a.penalty - b.penalty,
    );
    const percentiles = new Map<Result, number>();
    const groups = new Map<number, { higher: number; size: number }>();
    for (let start = 0; start < ordered.length; ) {
      let end = start + 1;
      while (
        end < ordered.length &&
        ordered[end].solved === ordered[start].solved
      )
        end++;
      groups.set(ordered[start].solved, { higher: start, size: end - start });
      start = end;
    }
    for (let start = 0; start < ordered.length; ) {
      let end = start + 1;
      while (
        end < ordered.length &&
        ordered[end].solved === ordered[start].solved &&
        ordered[end].penalty === ordered[start].penalty
      )
        end++;
      const p =
        ordered.length < 2
          ? 0.5
          : 1 - (start + (end - start - 1) / 2) / (ordered.length - 1);
      for (let i = start; i < end; i++) percentiles.set(ordered[i], p);
      start = end;
    }
    for (const r of c.results) {
      const key = canonical(r.team, data.aliases);
      const team = teams.get(key) ?? { team: key, history: [] };
      team.history.push({
        contest: c,
        result: r,
        score: performance(c, r, percentiles.get(r), groups.get(r.solved)),
      });
      teams.set(key, team);
    }
  }
  return [...teams.values()]
    .map((t) => {
      t.history.sort(
        (a, b) =>
          b.contest.date.localeCompare(a.contest.date) ||
          a.contest.id.localeCompare(b.contest.id),
      );
      const latest = t.history[0].result;
      const sites = new Map<string, typeof t.history>();
      for (const h of t.history) {
        const key = stationKey(h.contest.site);
        const group = sites.get(key) ?? [];
        group.push(h);
        sites.set(key, group);
      }
      // Equal weight per station prevents repeated contests at one station dominating the ranking.
      const stations = [...sites.entries()].map(([key, history]) => ({
        key,
        name: history[0].contest.site,
        count: history.length,
        level: mean(history.map((h) => h.score.level)),
        difficulty: mean(history.map((h) => h.score.difficultyLevel)),
      }));
      const level = mean(stations.map((s) => s.level));
      const spread = Math.sqrt(
        mean(stations.map((s) => (s.level - level) ** 2)),
      );
      const stability = stations.length < 2 ? 0 : clamp(level - spread);
      const performanceContribution = data.settings.performanceWeight * level;
      const stabilityContribution = data.settings.stabilityWeight * stability;
      const difficultyScore = mean(stations.map((s) => s.difficulty));
      const difficultyContribution =
        (100 -
          data.settings.performanceWeight -
          data.settings.stabilityWeight) *
        difficultyScore;
      const known = t.history.filter((h) => h.score.dirty !== null);
      const dirty = known.length
        ? known.reduce((sum, h) => sum + h.score.dirty! * h.result.solved, 0) /
          known.reduce((sum, h) => sum + h.result.solved, 0)
        : null;
      return {
        ...t,
        affiliation: latest.affiliation,
        country: Object.hasOwn(data.countries, t.team)
          ? data.countries[t.team]
          : latest.country,
        rating:
          performanceContribution +
          stabilityContribution +
          difficultyContribution,
        dirty,
        count: t.history.length,
        siteCount: stations.length,
        stations,
        level,
        spread,
        stability,
        performanceContribution,
        stabilityContribution,
        difficultyScore,
        difficultyContribution,
        knownDifficultyCount: t.history.filter(
          (h) => h.contest.difficulty !== null,
        ).length,
        knownDirtyCount: known.length,
        confidence:
          (Math.min(stations.length / 3, 1) * known.length) / t.history.length,
        latest: t.history[0].contest.date,
      };
    })
    .sort((a, b) => b.rating - a.rating || a.team.localeCompare(b.team))
    .map((t, i) => ({ ...t, rank: i + 1 }));
}
export type RankedTeam = ReturnType<typeof rankTeams>[number];
