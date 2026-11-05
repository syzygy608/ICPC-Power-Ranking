export type Country = "TW" | "OTHER" | "UNKNOWN";
export interface Problem {
  label: string;
  solved: boolean;
  attempts: number | null;
  time: number | null;
}
export interface Result {
  team: string;
  affiliation: string;
  country: Country;
  rank: number;
  solved: number;
  penalty: number;
  problems: Problem[];
}
export interface Contest {
  id: string;
  name: string;
  date: string;
  site: string;
  difficulty: number | null;
  problemCount: number;
  source: string;
  status?: "final" | "preliminary";
  results: Result[];
}
export interface Settings {
  performanceWeight: number;
  stabilityWeight: number;
}
export interface Dataset {
  version: 4;
  contests: Contest[];
  aliases: Record<string, string>;
  countries: Record<string, Country>;
  settings: Settings;
}
export const defaults: Settings = {
  performanceWeight: 65,
  stabilityWeight: 20,
};
export const teamKey = (s: string) =>
  s.normalize("NFKC").trim().replace(/\s+/g, " ");
