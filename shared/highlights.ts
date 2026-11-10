import { affiliationKey } from "./types";
export const schoolKey = (name: string) =>
  affiliationKey(name);
// Input is the complete ranking, before any search, country or school display filter.
export function selectTaiwanHighlights<
  T extends { team: string; affiliation: string; country: string; id?: string },
>(ranked: T[], limit = 10, perSchool = 2): T[] {
  const selected: T[] = [];
  const counts = new Map<string, number>();
  const teams = new Set<string>();
  for (const team of ranked) {
    if (selected.length >= limit) break;
    const school = schoolKey(team.affiliation);
    if (
      team.country !== "TW" ||
      !school ||
      teams.has(team.id ?? team.team) ||
      (counts.get(school) ?? 0) >= perSchool
    )
      continue;
    selected.push(team);
    teams.add(team.id ?? team.team);
    counts.set(school, (counts.get(school) ?? 0) + 1);
  }
  return selected;
}
