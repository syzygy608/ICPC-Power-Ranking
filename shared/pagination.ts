export function paginate(total: number, requestedPage: number, pageSize = 25) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(requestedPage, totalPages));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pages: (number | "gap")[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (
      totalPages <= 7 ||
      n === 1 ||
      n === totalPages ||
      Math.abs(n - page) <= 1 ||
      (page <= 3 && n <= 5) ||
      (page >= totalPages - 2 && n >= totalPages - 4)
    )
      pages.push(n);
    else if (pages.at(-1) !== "gap") pages.push("gap");
  }
  return { page, totalPages, start, end, total, pages };
}
