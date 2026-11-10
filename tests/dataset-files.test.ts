import { test, expect } from "bun:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import seed from "../src/data";
import manifest from "../src/data/rankings.json";
import {
  readDatasetFile,
  writeDatasetFile,
  writeSplitDataset,
} from "../scripts/dataset-files";
import { validateDataset } from "../shared/validation";
import { upsertContest } from "../shared/data";

test("published static imports and manifest load the same complete dataset", async () => {
  expect(await readDatasetFile("src/data/rankings.json")).toEqual(
    validateDataset(seed),
  );
  expect(manifest.contestFiles).toHaveLength(seed.contests.length);
  expect(new Set(manifest.contestFiles).size).toBe(seed.contests.length);
});

test("split data, portable backups and repeated updates round-trip without duplication", async () => {
  const dir = await mkdtemp(join(tmpdir(), "icpc-split-"));
  try {
    const file = join(dir, "rankings.json");
    const data = validateDataset(seed);
    const backup = join(dir, "backup.json");
    await writeFile(backup, JSON.stringify(data));
    expect(await readDatasetFile(backup)).toEqual(data);
    await writeSplitDataset(file, data);
    expect(await readDatasetFile(file)).toEqual(data);
    const changed = { ...data.contests[0], name: "Updated contest" };
    const next = upsertContest(data, changed);
    await writeDatasetFile(file, next);
    await writeDatasetFile(file, next);
    const loaded = await readDatasetFile(file);
    expect(loaded).toEqual(next);
    expect(loaded.contests).toHaveLength(data.contests.length);
    // Registry generated for Vite also works directly in Bun.
    expect(
      validateDataset((await import(join(dir, "index.ts"))).default),
    ).toEqual(next);
    await writeDatasetFile(backup, next);
    expect(await readDatasetFile(backup)).toEqual(next);
    const before = await readFile(file, "utf8");
    await expect(
      writeSplitDataset(file, {
        ...next,
        settings: { performanceWeight: 101, stabilityWeight: 20 },
      }),
    ).rejects.toThrow();
    expect(await readFile(file, "utf8")).toBe(before);
    await writeFile(
      file,
      JSON.stringify({ ...manifest, contestFiles: ["../private.json"] }),
    );
    await expect(readDatasetFile(file)).rejects.toThrow("contests/");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
