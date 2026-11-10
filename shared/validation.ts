import { canonical, canonicalResult } from "./ranking";
import { teamKey, defaults, isKnownCountry, type Dataset } from "./types";
const fail = (message: string): never => {
  throw new Error(message);
};
const number = (x: unknown, min: number, max: number) =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
const text = (x: unknown, max = 300): x is string =>
  typeof x === "string" && x.length > 0 && x.length <= max;
const contestCountry = (contest: Record<string, unknown>) => {
  const context = `${contest.name ?? ""} ${contest.site ?? ""} ${contest.source ?? ""}`.toLocaleLowerCase("en-US");
  if (/icpckorea|\bkorea\b|韓國/.test(context)) return "KR";
  if (/icpcjapan|\bjapan\b|日本/.test(context)) return "JP";
  if (/\bsingapore\b|新加坡/.test(context)) return "SG";
  return null;
};
export function validateDataset(input: unknown): Dataset {
  if (!input || typeof input !== "object") fail("無效的 JSON 資料");
  const raw = input as Record<string, unknown>;
  if (
    ![1, 2, 3, 4, 5].includes(raw.version as number) ||
    !Array.isArray(raw.contests) ||
    raw.contests.length > 500
  )
    fail("不支援的資料版本或超過 500 場比賽");
  // Migrate legacy backups and browser drafts without discarding scores, aliases or countries.
  const d = {
    ...Object.fromEntries(
      Object.entries(raw).filter(([key]) => key !== "yunlinTeams"),
    ),
    version: 4,
    settings: raw.version !== 4 && raw.version !== 5 ? { ...defaults } : raw.settings,
    contests: (raw.contests as unknown[]).map((c: unknown) => {
      if (!c || typeof c !== "object") fail("比賽資料格式錯誤");
      const { strength, siteStats, weight, ...record } = c as Record<
        string,
        unknown
      >;
      const inferredCountry = contestCountry(record);
      return {
        ...record,
        difficulty: record.difficulty ?? null,
        // Some legacy DOMjudge exports only say "foreign" per row.  For a
        // clearly single-country contest, retain the useful country context.
        results: Array.isArray(record.results) && inferredCountry
          ? record.results.map((result) =>
              result && typeof result === "object" &&
              (result as Record<string, unknown>).country === "OTHER"
                ? { ...(result as Record<string, unknown>), country: inferredCountry }
                : result,
            )
          : record.results,
      };
    }),
  } as unknown as Dataset;
  if (
    !d.settings ||
    !number(d.settings.performanceWeight, 0, 100) ||
    !number(d.settings.stabilityWeight, 0, 100) ||
    d.settings.performanceWeight + d.settings.stabilityWeight > 100
  )
    fail("兩項權重必須介於 0–100，且合計不可超過 100");
  d.settings = {
    performanceWeight: d.settings.performanceWeight,
    stabilityWeight: d.settings.stabilityWeight,
  };
  for (const map of [d.aliases, d.countries])
    if (!map || typeof map !== "object" || Array.isArray(map))
      fail("隊伍設定格式錯誤");
  for (const [k, v] of Object.entries(d.aliases)) {
    if (
      !text(k) ||
      !text(v) ||
      k !== teamKey(k) ||
      v !== teamKey(v) ||
      ["__proto__", "constructor", "prototype"].includes(k)
    )
      fail("別名格式錯誤");
    canonical(k, d.aliases);
  }
  for (const [k, v] of Object.entries(d.countries))
    if (!text(k) || typeof v !== "string" || !isKnownCountry(v))
      fail("國別格式錯誤");
  const ids = new Set<string>();
  for (const c of d.contests) {
    if (!text(c.id) || ids.has(c.id)) fail("比賽 ID 不可重複或留空");
    ids.add(c.id);
    if (c.status !== undefined && !["final", "preliminary"].includes(c.status))
      fail("無效的成績狀態");
    if (
      !text(c.name) ||
      !text(c.site) ||
      typeof c.source !== "string" ||
      c.source.length > 2000
    )
      fail("比賽資訊不完整");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(c.date) ||
      !Number.isFinite(Date.parse(c.date)) ||
      new Date(c.date).toISOString().slice(0, 10) !== c.date
    )
      fail("無效的比賽日期");
    if (!number(c.problemCount, 1, 100) || !Number.isInteger(c.problemCount))
      fail("賽站參數超出範圍");
    if (
      !Array.isArray(c.results) ||
      !c.results.length ||
      c.results.length > 10000
    )
      fail("比賽必須有 1–10000 隊");
    if (c.difficulty !== null && !number(c.difficulty, 0.5, 2))
      fail("站點難度必須介於 0.5–2，或留空表示未校準");
    const names = new Set<string>();
    for (const r of c.results) {
      if (
        !text(r.team) ||
        r.team !== teamKey(r.team) ||
        typeof r.affiliation !== "string" ||
        !isKnownCountry(r.country)
      )
        fail("隊伍資訊格式錯誤");
      const key = canonicalResult(r, d.aliases);
      if (names.has(key)) fail(`同場比賽出現重複隊名：${key}`);
      names.add(key);
      if (
        !number(r.rank, 1, 10000) ||
        !Number.isInteger(r.rank) ||
        !number(r.solved, 0, c.problemCount) ||
        !Number.isInteger(r.solved) ||
        !number(r.penalty, 0, 1e9)
      )
        fail(`隊伍成績格式錯誤：${key}`);
      if (
        !Array.isArray(r.problems) ||
        (r.problems.length !== 0 && r.problems.length !== c.problemCount)
      )
        fail(`題目欄位數量不符：${key}`);
      for (const p of r.problems)
        if (
          !text(p.label) ||
          typeof p.solved !== "boolean" ||
          !(
            p.attempts === null ||
            (number(p.attempts, 0, 100000) && Number.isInteger(p.attempts))
          ) ||
          !(p.time === null || number(p.time, 0, 100000)) ||
          (p.solved && p.attempts === 0)
        )
          fail(`題目資料錯誤：${key}`);
      if (
        r.problems.length &&
        r.problems.filter((p) => p.solved).length !== r.solved
      )
        fail(`解題數與 AC 欄位不符：${key}`);
    }
  }
  return d;
}
