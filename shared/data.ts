import type { Contest, Dataset } from "./types";
import { validateDataset } from "./validation";
export function upsertContest(data: Dataset, contest: Contest): Dataset {
  return validateDataset({
    ...data,
    contests: [...data.contests.filter((c) => c.id !== contest.id), contest],
  });
}
