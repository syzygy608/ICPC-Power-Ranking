/** ISO 3166-1 alpha-2 country code, plus legacy OTHER and UNKNOWN values. */
export type Country = string;
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

export const affiliationKey = (s: string) =>
  teamKey(s).replace(/台/g, "臺").toLocaleLowerCase("en-US");

/**
 * A display name is not a stable identifier internationally: the same name may
 * legitimately appear at different schools or in different countries.
 */
export const teamIdentity = (
  team: string,
  affiliation: string,
  country: Country,
) =>
  [teamKey(team), affiliationKey(affiliation), teamKey(country).toUpperCase()].join(
    "\u001f",
  );

export const isKnownCountry = (country: Country) =>
  /^[A-Z]{2}$/.test(country) || country === "OTHER" || country === "UNKNOWN";

const countryNames: Record<string, string> = {
  TW: "台灣", JP: "日本", KR: "韓國", CN: "中國", HK: "香港", MO: "澳門",
  SG: "新加坡", MY: "馬來西亞", TH: "泰國", VN: "越南", ID: "印尼",
  PH: "菲律賓", IN: "印度", US: "美國", CA: "加拿大", GB: "英國",
  DE: "德國", FR: "法國", NL: "荷蘭", SE: "瑞典", FI: "芬蘭",
  NO: "挪威", DK: "丹麥", PL: "波蘭", RU: "俄羅斯", UA: "烏克蘭",
  AU: "澳洲", NZ: "紐西蘭", BR: "巴西", MX: "墨西哥",
};

export const countryLabel = (country: Country) =>
  country === "UNKNOWN"
    ? "待確認"
    : country === "OTHER"
      ? "其他國家"
      : countryNames[country] ?? country;
