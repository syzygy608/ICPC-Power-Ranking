import { parseArgs } from "node:util";
import { parseScoreboard } from "../shared/parser";
import { validateDataset } from "../shared/validation";
import { upsertContest } from "../shared/data";
import type { Contest } from "../shared/types";
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    id: { type: "string" },
    name: { type: "string" },
    date: { type: "string" },
    site: { type: "string" },
    difficulty: { type: "string" },
    source: { type: "string", default: "" },
    status: { type: "string", default: "final" },
    output: { type: "string", default: "src/data/rankings.json" },
  },
});
try {
  const path = positionals[0];
  if (!path || !values.id || !values.name || !values.date || !values.site)
    throw new Error(
      "Usage: bun run import-scoreboard FILE --id ID --name NAME --date YYYY-MM-DD --site SITE [--difficulty 1.0 --source URL --status final --output src/data/rankings.json]",
    );
  const input = Bun.file(path);
  if (input.size > 5_000_000) throw new Error("榜單檔案需小於 5 MB");
  const parsed = parseScoreboard(await input.text());
  const existing = validateDataset(await Bun.file(values.output!).json());
  const contest: Contest = {
    id: values.id,
    name: values.name,
    date: values.date,
    site: values.site,
    difficulty:
      values.difficulty === undefined ? null : Number(values.difficulty),
    source: values.source!,
    status: values.status as Contest["status"],
    results: parsed.results,
    problemCount: parsed.problemCount,
  };
  const result = upsertContest(existing, contest);
  // Validation completes before an atomic replacement; rerunning the same ID is idempotent.
  const { rename, unlink } = await import("node:fs/promises");
  const tmp = `${values.output}.${crypto.randomUUID()}.tmp`;
  try {
    await Bun.write(tmp, JSON.stringify(result, null, 2) + "\n");
    await rename(tmp, values.output!);
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw e;
  }
  for (const warning of parsed.warnings) console.warn(warning);
  console.log(
    `Imported ${contest.name}: ${contest.results.length} teams, ${contest.problemCount} problems → ${values.output}`,
  );
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
