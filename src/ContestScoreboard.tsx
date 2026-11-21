import { lazy, Suspense, useState } from "react";
import type { Contest, Dataset } from "../shared/types";

const Scoreboard = lazy(() => import("./Scoreboard"));

export interface ScoreboardProps {
  contest: Contest;
  aliases: Dataset["aliases"];
  onSelect: (id: string) => void;
}

export default function ContestScoreboard(props: ScoreboardProps) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="scoreboard-details"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{open ? "收合逐題記分板" : "展開逐題記分板"}</summary>
      {open && (
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-28 items-center justify-center gap-3 text-sm text-muted"
            >
              <span
                aria-hidden="true"
                className="size-5 animate-spin rounded-full border-2 border-gold-200 border-t-gold-700 motion-reduce:animate-none"
              />
              正在載入記分板…
            </div>
          }
        >
          <Scoreboard {...props} />
        </Suspense>
      )}
    </details>
  );
}
