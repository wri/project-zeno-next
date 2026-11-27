import { describe, expect, it } from "vitest";

import { rankingOf, type RankedArea, type Ranking } from "../ranking";
import { rankingView } from "../ranking-view";

/** `bars` areas worth 100, 99, … then `empty` areas with no value. */
function ranking(bars: number, empty = 0): Ranking {
  const area = (i: number, value: number): RankedArea => ({
    aoiId: `a${i}`,
    rank: i + 1,
    name: `Area ${i}`,
    value,
  });
  return rankingOf("loss", "ha", [
    ...Array.from({ length: bars }, (_, i) => area(i, 100 - i)),
    ...Array.from({ length: empty }, (_, i) => area(bars + i, 0)),
  ]);
}

describe("rankingView", () => {
  it("pages the bars ten at a time and counts the bars", () => {
    const first = rankingView(ranking(44, 3), 0);
    expect(first).toMatchObject({ start: 1, end: 10, pageCount: 5 });
    expect(ranking(44, 3).bars).toHaveLength(44);
    expect(first.hasPrevious).toBe(false);
    expect(first.hasNext).toBe(true);

    const last = rankingView(ranking(44, 3), 4);
    expect(last).toMatchObject({ start: 41, end: 44, hasNext: false });
    expect(last.rows).toHaveLength(4);
  });

  it("pages over the bars only, never the areas with no value", () => {
    const view = rankingView(ranking(12, 3), 1);
    expect(view.rows.map((a) => a.aoiId)).toEqual(["a10", "a11"]);
    expect(view.rows.every((a) => a.value > 0)).toBe(true);
  });

  it("clamps a page that is gone", () => {
    expect(rankingView(ranking(15), 9).page).toBe(1);
    expect(rankingView(ranking(15), -3).page).toBe(0);
  });

  it("is one page for exactly ten bars, with the empty areas listed", () => {
    const view = rankingView(ranking(10, 3), 0);
    expect(view).toMatchObject({ pageCount: 1, hasNext: false });
    expect(ranking(10, 3).noValue).toHaveLength(3);
  });
});
