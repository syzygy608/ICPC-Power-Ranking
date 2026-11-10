import { parse, type DefaultTreeAdapterMap } from "parse5";
import { teamKey, type Result, type Problem, type Country } from "./types";
type Node = DefaultTreeAdapterMap["node"];
const children = (n: Node): Node[] => ("childNodes" in n ? n.childNodes : []);
const attr = (n: Node, k: string) =>
  "attrs" in n ? (n.attrs.find((a) => a.name === k)?.value ?? "") : "";
const cls = (n: Node, k: string) => attr(n, "class").split(/\s+/).includes(k);
const tag = (n: Node, k: string) => "tagName" in n && n.tagName === k;
const rawText = (n: Node): string =>
  n.nodeName === "#text"
    ? (n as DefaultTreeAdapterMap["textNode"]).value
    : children(n)
        .filter((c) => !tag(c, "script") && !tag(c, "style"))
        .map(rawText)
        .join(" ");
const txt = (n: Node) => rawText(n).replace(/\s+/g, " ").trim();
const countryAliases: Record<string, string> = {
  taiwan: "TW", "chinese taipei": "TW", twn: "TW", tw: "TW",
  japan: "JP", japanese: "JP", jpn: "JP", jp: "JP",
  korea: "KR", "south korea": "KR", kor: "KR", kr: "KR",
  china: "CN", chn: "CN", cn: "CN", hongkong: "HK", "hong kong": "HK", hk: "HK",
  singapore: "SG", sgp: "SG", sg: "SG", malaysia: "MY", mys: "MY", my: "MY",
  vietnam: "VN", vnm: "VN", vn: "VN", thailand: "TH", tha: "TH", th: "TH",
  indonesia: "ID", idn: "ID", id: "ID", india: "IN", ind: "IN", in: "IN",
  usa: "US", "united states": "US", us: "US", canada: "CA", can: "CA", ca: "CA",
  uk: "GB", "united kingdom": "GB", england: "GB", gb: "GB",
};
function parseCountry(flag: string, affiliation: string): Country {
  const tokens = flag.toLocaleLowerCase("en-US").match(/[a-z]{2,}/g) ?? [];
  for (const token of tokens) if (countryAliases[token]) return countryAliases[token];
  const normalized = flag.toLocaleLowerCase("en-US").replace(/[^a-z]+/g, " ");
  for (const [name, code] of Object.entries(countryAliases))
    if (normalized.includes(name)) return code;
  if (/國立(?:臺灣|台灣|成功|中正|中興|清華|陽明交通|中央|中山|嘉義|高雄|臺北|雲林|虎尾|暨南)|臺北市立|銘傳|逢甲|輔仁|靜宜|大同|康寧|淡江|元智/.test(affiliation)) return "TW";
  return flag ? "OTHER" : "UNKNOWN";
}
function all(n: Node, predicate: (n: Node) => boolean): Node[] {
  return [
    ...(predicate(n) ? [n] : []),
    ...children(n).flatMap((c) => all(c, predicate)),
  ];
}
export function parseScoreboard(html: string): {
  results: Result[];
  problemCount: number;
  warnings: string[];
  title: string;
} {
  if (html.length > 5_000_000) throw new Error("榜單檔案需小於 5 MB");
  const doc = parse(html);
  const tables = all(doc, (n) => tag(n, "table"));
  const table =
    tables.find((n) => cls(n, "scoreboard")) ??
    tables.find(
      (n) =>
        all(n, (c) => cls(c, "scoreboard-teamname") || cls(c, "scoretn"))
          .length,
    );
  if (!table)
    throw new Error(
      "找不到 DOMjudge scoreboard 表格，請上傳完整 HTML 或使用 JSON 格式。",
    );
  const rows = all(table, (n) => tag(n, "tr"));
  const warnings: string[] = [];
  if (/preliminary|unofficial|not final|frozen/i.test(txt(doc)))
    warnings.push("來源為暫定或封榜資料；請確認狀態並降低比賽權重。");
  const results: Result[] = [];
  let problemCount = 0;
  for (const row of rows) {
    const cells = children(row).filter((n) => tag(n, "td"));
    const teamCell = cells.find(
      (n) => cls(n, "scoreboard-teamname") || cls(n, "scoretn"),
    );
    if (!teamCell) continue;
    const scoreCells = cells.filter(
      (n) =>
        cls(n, "score_cell") ||
        cls(n, "scoreboard-problem") ||
        /^score_(correct|incorrect|neutral|pending|first)/.test(
          attr(n, "class"),
        ),
    );
    // Standard DOMjudge places two scoreboard-score cells before score_cell problem cells.
    const totals = cells.filter((n) => cls(n, "scoreboard-score"));
    const solvedCell = totals[0] ?? cells.find((n) => cls(n, "scorenc"));
    const penaltyCell = totals[1] ?? cells.find((n) => cls(n, "scorett"));
    if (!solvedCell || !penaltyCell)
      throw new Error("找不到總解題數與罰時欄位，尚未支援這個榜單版本。");
    if (!/^\d+$/.test(txt(solvedCell)) || !/^\d+$/.test(txt(penaltyCell)))
      throw new Error("成績欄位不可空白");
    const solved = Number(txt(solvedCell));
    const penalty = Number(txt(penaltyCell));
    if (
      !Number.isInteger(solved) ||
      solved < 0 ||
      !Number.isFinite(penalty) ||
      penalty < 0
    )
      throw new Error("成績欄位格式無法解析");
    const nameNode = all(
      teamCell,
      (n) => cls(n, "teamname") || cls(n, "team-name"),
    )[0];
    const affiliationNode = all(
      teamCell,
      (n) => tag(n, "small") || cls(n, "affiliation") || cls(n, "univ"),
    )[0];
    let affiliation = affiliationNode ? txt(affiliationNode) : "";
    const images = all(row, (n) => tag(n, "img"));
    if (!affiliation)
      affiliation =
        images
          .map((n) => attr(n, "title"))
          .find((s) => /大學|University|Institute|College/i.test(s)) ?? "";
    const clean = (n: Node): string => {
      if (
        n !== teamCell &&
        (tag(n, "small") ||
          tag(n, "img") ||
          cls(n, "badge") ||
          cls(n, "affiliation") ||
          cls(n, "univ") ||
          cls(n, "category"))
      )
        return "";
      return n.nodeName === "#text"
        ? rawText(n)
        : children(n).map(clean).join(" ");
    };
    const team = teamKey(
      attr(row, "data-team-name") ||
        attr(teamCell, "title") ||
        (nameNode ? txt(nameNode) : clean(teamCell)),
    );
    if (!team) throw new Error("榜單中有空白隊名");
    const flag = images
      .map((n) => `${attr(n, "src")} ${attr(n, "title")} ${attr(n, "alt")}`)
      .join(" ");
    const country = parseCountry(flag, affiliation);
    const problems: Problem[] = scoreCells.map((cell, i) => {
      const text = txt(cell);
      const classes = all(cell, () => true)
        .map((n) => attr(n, "class"))
        .join(" ");
      const solved =
        /score_correct|score_first|solved/.test(classes) &&
        !/unsolved/.test(classes);
      const tries = text.match(/(\d+)\s*tr(?:y|ies)/i);
      const plus = text.match(/\+(\d*)/);
      const attempts = tries
        ? Number(tries[1])
        : plus
          ? Number(plus[1] || 0) + 1
          : text.match(/^-(\d+)/)
            ? Number(text.match(/^-(\d+)/)![1])
            : text === ""
              ? 0
              : null;
      const before = text.replace(/\d+\s*tr(?:y|ies).*/i, "").trim();
      const time =
        solved && /^\d+(?:\.\d+)?$/.test(before) ? Number(before) : null;
      return { label: String.fromCharCode(65 + i), solved, attempts, time };
    });
    if (problems.length && problems.filter((p) => p.solved).length !== solved)
      throw new Error(
        `${team} 的 AC 欄位與總解題數不符，請確認是已解凍的最終榜單。`,
      );
    if (problems.length && problemCount && problems.length !== problemCount)
      throw new Error("各隊題目欄位數量不一致");
    problemCount = Math.max(problemCount, problems.length);
    const rankCell = cells.find(
      (n) => cls(n, "scorepl") || cls(n, "scoreboard-rank"),
    );
    const explicitRank = rankCell ? Number(txt(rankCell)) : 0;
    const previous = results.at(-1);
    const rank =
      explicitRank > 0
        ? explicitRank
        : previous && previous.solved === solved && previous.penalty === penalty
          ? previous.rank
          : results.length + 1;
    results.push({
      team,
      affiliation,
      country,
      rank,
      solved,
      penalty,
      problems,
    });
  }
  if (!results.length) throw new Error("榜單中沒有可辨識的隊伍");
  if (!problemCount)
    throw new Error("找不到逐題成績，請改用含 problemCount 的標準 JSON");
  const names = new Set<string>();
  for (const r of results) {
    if (names.has(r.team)) throw new Error(`同場有重複隊名：${r.team}`);
    names.add(r.team);
  }
  if (results.some((r) => r.country === "UNKNOWN"))
    warnings.push("部分隊伍缺少國別，請在預覽中確認台灣隊伍。");
  if (
    results.some((r) => r.problems.some((p) => p.solved && p.attempts === null))
  )
    warnings.push("部分 AC 缺少嘗試次數，該隊不套用 dirty 扣分。");
  return {
    results,
    problemCount,
    warnings,
    title: txt(all(doc, (n) => tag(n, "title"))[0] ?? table).slice(0, 120),
  };
}
