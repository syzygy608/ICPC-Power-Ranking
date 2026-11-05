import seed from "./data/rankings.json";
import { validateDataset } from "../shared/validation";
import type { Dataset } from "../shared/types";
export const published = validateDataset(seed);
const KEY = "icpc-power-ranking:v1";
// A stable revision detects a new published dataset without silently overwriting drafts.
const revision = JSON.stringify(published);
export function loadData(): {
  data: Dataset;
  draft: boolean;
  stale: boolean;
  error: string;
} {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { data: published, draft: false, stale: false, error: "" };
    const saved = JSON.parse(raw);
    return {
      data: validateDataset(saved.data),
      draft: true,
      stale: saved.revision !== revision,
      error: "",
    };
  } catch {
    return {
      data: published,
      draft: false,
      stale: false,
      error: "本機草稿無法讀取，目前顯示正式資料。匯出前請勿清除瀏覽器資料。",
    };
  }
}
export function persist(data: Dataset) {
  const normalized = validateDataset(data);
  localStorage.setItem(KEY, JSON.stringify({ revision, data: normalized }));
}
export function reset() {
  localStorage.removeItem(KEY);
}
export function download(data: Dataset) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "rankings.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
