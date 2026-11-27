import * as stylex from "@stylexjs/stylex";
import { ui } from "./styles/ui";
import { panels } from "./styles/panels";
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
      {...stylex.props(panels.scoreboardDetails)}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary {...stylex.props(ui.summary, panels.scoreboardSummary)}>
        {open ? "收合逐題記分板" : "展開逐題記分板"}
      </summary>
      {open && (
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              {...stylex.props(panels.loading)}
            >
              <span aria-hidden="true" {...stylex.props(panels.spinner)} />
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
