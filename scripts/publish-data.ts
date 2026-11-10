import { resolve } from "node:path";
import { readDatasetFile, writeSplitDataset } from "./dataset-files";

try {
  const input = process.argv[2];
  if (!input)
    throw new Error(
      "Usage: bun run publish-data BACKUP.json [src/data/rankings.json]",
    );
  const output = process.argv[3] ?? "src/data/rankings.json";
  const data = await readDatasetFile(resolve(input));
  await writeSplitDataset(resolve(output), data);
  console.log(`Published ${data.contests.length} contests → ${output}`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
