import * as stylex from "@stylexjs/stylex";
import { ui } from "./styles/ui";
import { tables } from "./styles/tables";
import { useEffect, useState, type RefObject } from "react";
import { paginate } from "../shared/pagination";

export function usePagination(total: number) {
  const [requestedPage, setPage] = useState(1);
  const result = paginate(total, requestedPage);
  useEffect(() => {
    if (requestedPage !== result.page) setPage(result.page);
  }, [requestedPage, result.page]);
  return { ...result, setPage };
}

export default function Pagination({
  pagination,
  label,
  unit,
  resultsRef,
}: {
  pagination: ReturnType<typeof usePagination>;
  label: string;
  unit: string;
  resultsRef?: RefObject<HTMLDivElement | null>;
}) {
  const { page, totalPages, start, end, total, pages, setPage } = pagination;
  function goToPage(next: number) {
    if (next === page) return;
    setPage(next);
    if (window.matchMedia("(max-width: 649px)").matches) {
      resultsRef?.current?.scrollIntoView({ block: "start" });
    }
  }
  return (
    <div {...stylex.props(tables.footer)}>
      <span role="status">
        顯示 {total ? start + 1 : 0}–{end} / {total} {unit}
      </span>
      <nav {...stylex.props(tables.pagination)} aria-label={`${label}分頁`}>
        <button
          {...stylex.props(ui.button, tables.pageButton)}
          type="button"
          aria-label="上一頁"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          上一頁
        </button>
        {pages.map((n, i) =>
          n === "gap" ? (
            <span
              key={`gap-${i}`}
              {...stylex.props(tables.desktopPage)}
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              {...stylex.props(
                ui.button,
                tables.pageButton,
                n === page && ui.primary,
                n !== page && n !== 1 && n !== totalPages && tables.desktopPage,
              )}
              type="button"
              key={n}
              aria-label={`第 ${n} 頁`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => goToPage(n)}
            >
              {n}
            </button>
          ),
        )}
        <button
          {...stylex.props(ui.button, tables.pageButton)}
          type="button"
          aria-label="下一頁"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          下一頁
        </button>
      </nav>
    </div>
  );
}
