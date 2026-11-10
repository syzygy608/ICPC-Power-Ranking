import { parseArgs } from "node:util";
import { parseScoreboard } from "../shared/parser";
import { upsertContest } from "../shared/data";
import type { Contest } from "../shared/types";
import { readDatasetFile, writeDatasetFile } from "./dataset-files";
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
  const existing = await readDatasetFile(values.output!);
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
  // Supports both split repository data and traditional single-file backups.
  await writeDatasetFile(values.output!, result);
  for (const warning of parsed.warnings) console.warn(warning);
  console.log(
    `Imported ${contest.name}: ${contest.results.length} teams, ${contest.problemCount} problems → ${values.output}`,
  );
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
