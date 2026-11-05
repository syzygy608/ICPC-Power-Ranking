import type { RankedTeam } from "./ranking";
import { schoolKey } from "./highlights";
export function rankSchools(teams: RankedTeam[]) {
  const schools = new Map<string, { school: string; teams: RankedTeam[] }>();
  for (const t of teams) {
    const key = schoolKey(t.affiliation);
    if (t.country !== "TW" || !key) continue;
    const school = schools.get(key) ?? { school: t.affiliation, teams: [] };
    school.teams.push(t);
    schools.set(key, school);
  }
  return [...schools.values()]
    .map((s) => {
      s.teams.sort(
        (a, b) => b.rating - a.rating || a.team.localeCompare(b.team),
      );
      const scoringTeams = s.teams.slice(0, 6);
      const average =
        scoringTeams.reduce((sum, t) => sum + t.rating, 0) /
        scoringTeams.length;
      const maximum = scoringTeams[0].rating;
      const minimum = scoringTeams[scoringTeams.length - 1].rating;
      return {
        ...s,
        scoringTeams,
        average,
        maximum,
        minimum,
        index: 0.7 * average + 0.2 * maximum + 0.1 * minimum,
        siteCount: new Set(
          scoringTeams.flatMap((t) => t.stations.map((s) => s.key)),
        ).size,
      };
    })
    .sort((a, b) => b.index - a.index || a.school.localeCompare(b.school))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
