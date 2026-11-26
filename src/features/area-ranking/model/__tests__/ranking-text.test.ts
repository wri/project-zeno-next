import { describe, expect, it } from "vitest";

import type { RankedArea, Ranking } from "../ranking";
import {
  barValueText,
  displayName,
  noValueText,
  pageShare,
  shareText,
  tooltipLines,
  topNoteText,
  valueReserve,
} from "../ranking-text";
import { rankingView } from "../ranking-view";

const area = (overrides: Partial<RankedArea> = {}): RankedArea => ({
  aoiId: "BRA.1",
  rank: 1,
  name: "Bom Jesus",
  parent: "Piauí",
  value: 72050.31,
  share: 15.21,
  ...overrides,
});

const ranking = (
  areas: RankedArea[],
  overrides: Partial<Ranking> = {}
): Ranking => ({ measure: "loss", unit: "ha", areas, ...overrides });

describe("shareText", () => {
  it("shows one decimal, and <0.1% below 0.05", () => {
    expect(shareText(8.84)).toBe("8.8%");
    expect(shareText(0.05)).toBe("0.1%");
    expect(shareText(0.04)).toBe("<0.1%");
  });
});

describe("tooltipLines", () => {
  const areas = [
    area(),
    ...Array.from({ length: 46 }, (_, i) => area({ aoiId: `x${i}` })),
  ];

  it("gives the full name, the exact value and the share of the areas", () => {
    expect(tooltipLines(areas[0], ranking(areas))).toEqual([
      "Bom Jesus, Piauí",
      "72,050.31 ha · 15.2% of all loss in the 47 areas",
    ]);
  });

  it("gives the value alone when the areas have no share", () => {
    const bare = area({ share: undefined, parent: undefined });
    expect(tooltipLines(bare, ranking([bare]))).toEqual([
      "Bom Jesus",
      "72,050.31 ha",
    ]);
  });

  it("says emissions for the emissions chart", () => {
    const emissions = ranking([area()], {
      measure: "emissions",
      unit: "MgCO₂e",
    });
    expect(tooltipLines(emissions.areas[0], emissions)[1]).toBe(
      "72,050.31 MgCO₂e · 15.2% of all emissions in the 1 areas"
    );
  });
});

describe("barValueText", () => {
  it("shortens both hectares and emissions", () => {
    expect(barValueText(area(), ranking([area()]))).toBe("72.1K ha");
    const emissions = ranking([area()], {
      measure: "emissions",
      unit: "MgCO₂e",
    });
    expect(barValueText(area(), emissions)).toBe("72.1K MgCO₂e");
    expect(barValueText(area({ value: 531609390.59 }), emissions)).toBe(
      "531.6M MgCO₂e"
    );
    // The tooltip keeps the exact figure.
    expect(
      tooltipLines(
        area({ value: 531609390.59, share: undefined }),
        emissions
      )[1]
    ).toBe("531,609,390.59 MgCO₂e");
  });
});

describe("displayName", () => {
  it("gives the name, and the qualifier after a dot when there is one", () => {
    expect(displayName(area())).toBe("Bom Jesus");
    expect(displayName(area({ qualifier: "Piauí" }))).toBe("Bom Jesus · Piauí");
  });
});

describe("noValueText", () => {
  const empty = [
    area({ value: 0, name: "Belém" }),
    area({ value: 0, name: "Bom Jesus", qualifier: "Piauí" }),
  ];

  it("names the areas, with the parent where the name repeats", () => {
    expect(noValueText(ranking(empty), empty)).toBe(
      "No tree cover loss in 2 areas: Belém, Bom Jesus · Piauí."
    );
  });

  it("picks the phrase from the measure and the number from the count", () => {
    expect(
      noValueText(ranking(empty, { measure: "emissions" }), [empty[0]])
    ).toBe("No emissions in 1 area: Belém.");
  });
});

describe("topNoteText", () => {
  it("says how many of the areas are shown", () => {
    expect(topNoteText(10, 47)).toBe("Top 10 of 47 areas.");
  });
});

describe("valueReserve", () => {
  it("sizes the track from the longest value over every page", () => {
    const small = Array.from({ length: 20 }, (_, i) =>
      area({ aoiId: `s${i}`, value: 1200, share: undefined })
    );
    const big = area({ aoiId: "big", value: 123456789.12 });
    const emissions = ranking([...small, big], {
      measure: "emissions",
      unit: "MgCO₂e",
    });
    // "123.5M MgCO₂e" is 13 characters (the small ones are 11), on page 3.
    expect(valueReserve(emissions, false)).toBe("15ch");
  });

  it("counts the share in print", () => {
    const loss = ranking([area({ value: 5000, share: 8.84 })]);
    const width = (reserve: string) => parseInt(reserve, 10);
    // " · 8.8%" adds 7 characters.
    expect(width(valueReserve(loss, true))).toBe(
      width(valueReserve(loss, false)) + 7
    );
  });
});

describe("pageShare", () => {
  const withAreas = (count: number) =>
    ranking(
      Array.from({ length: count }, (_, i) =>
        area({ aoiId: `A${i}`, rank: i + 1, value: 100 - i * 5, share: 1 })
      )
    );
  const twelve = withAreas(12);

  it("leads with the first page's share and the sums", () => {
    const share = pageShare(twelve, rankingView(twelve, 0));
    expect(share?.lead).toBe("Top 10 areas: 89.1% of all loss");
    expect(share?.beforePct).toBe(0);
  });

  it("names the ranks and the running total on a later page", () => {
    const share = pageShare(twelve, rankingView(twelve, 1));
    expect(share?.lead).toBe("Ranks 11–12: 10.9% of all loss");
    expect(share?.tail).toBe("· top 12: 100.0%");
  });

  it("gives the last page's line for a stale page past the end", () => {
    const share = pageShare(twelve, rankingView(twelve, 5));
    expect(share?.lead).toBe("Ranks 11–12: 10.9% of all loss");
  });

  it("is absent for a one-page ranking", () => {
    const few = withAreas(10);
    expect(pageShare(few, rankingView(few, 0))).toBeUndefined();
  });

  it("is absent without shares", () => {
    const none = ranking([area({ share: undefined })]);
    expect(pageShare(none, rankingView(none, 0))).toBeUndefined();
  });
});
