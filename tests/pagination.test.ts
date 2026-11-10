import { expect, test } from "bun:test";
import { paginate } from "../shared/pagination";

test("pages cover every result once, including the last partial page", () => {
  const items = Array.from({ length: 858 }, (_, i) => i);
  const all: number[] = [];
  for (let n = 1; n <= 35; n++) {
    const p = paginate(items.length, n);
    all.push(...items.slice(p.start, p.end));
    expect(p.pages).toContain(p.page);
  }
  expect(all).toEqual(items);
  expect(paginate(items.length, 35).end).toBe(858);
});

test("empty results and filtering on a later page stay within valid bounds", () => {
  expect(paginate(0, 9)).toMatchObject({
    page: 1,
    totalPages: 1,
    start: 0,
    end: 0,
  });
  expect(paginate(10, 9)).toMatchObject({ page: 1, start: 0, end: 10 });
  expect(paginate(25, 1).totalPages).toBe(1);
  expect(paginate(26, 2)).toMatchObject({ page: 2, start: 25, end: 26 });
});

test("number navigation keeps first, current and last pages, with bounded buttons", () => {
  for (const current of [1, 2, 50, 99, 100]) {
    const p = paginate(2500, current);
    expect(p.pages).toContain(1);
    expect(p.pages).toContain(current);
    expect(p.pages).toContain(100);
    expect(p.pages.length).toBeLessThanOrEqual(9);
    expect(new Set(p.pages.filter((n) => typeof n === "number")).size).toBe(
      p.pages.filter((n) => typeof n === "number").length,
    );
  }
});
