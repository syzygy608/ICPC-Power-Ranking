import { useEffect, useState } from "react";
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
}: {
  pagination: ReturnType<typeof usePagination>;
  label: string;
  unit: string;
}) {
  const { page, totalPages, start, end, total, pages, setPage } = pagination;
  return (
    <div className="table-footer pagination-footer">
      <span role="status">
        顯示 {total ? start + 1 : 0}–{end} / {total} {unit}
      </span>
      <nav className="pagination" aria-label={`${label}分頁`}>
        <button
          type="button"
          aria-label="上一頁"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          上一頁
        </button>
        {pages.map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={n}
              aria-label={`第 ${n} 頁`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="下一頁"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          下一頁
        </button>
      </nav>
    </div>
  );
}
