import { describe, it, expect } from "vitest";
import type { RecordedAnalysisInputs } from "@/src/entities/insight";
import { buildChips } from "../analysis-params-utils";

const inputs = (
  overrides: Partial<RecordedAnalysisInputs> = {}
): RecordedAnalysisInputs => ({
  recorded: true,
  areas: [],
  datasets: [],
  canopyCover: [],
  years: [],
  ...overrides,
});

const rendered = (chips: ReturnType<typeof buildChips>) =>
  chips.map((c) => `${c.label} ${c.value}`);

describe("buildChips", () => {
  it.each([
    [
      "uses the short label a dataset defines",
      "Global natural/semi-natural grassland extent",
      "Grasslands",
    ],
    ["falls back to the full name", "Tree cover loss", "Tree cover loss"],
    [
      "leaves an unknown name unchanged",
      "Some custom layer",
      "Some custom layer",
    ],
  ])("%s", (_label, name, value) => {
    const [data] = buildChips(inputs({ datasets: [{ name }] }));
    expect(data).toMatchObject({ label: "DATA", value, tooltip: name });
  });

  it("builds one chip per distinct area, dataset, canopy value and year range", () => {
    const chips = buildChips(
      inputs({
        areas: [{ name: "Pará, Brazil" }, { name: "Acre, Brazil" }],
        datasets: [
          { name: "Tree cover loss", id: 4 },
          { name: "Tree cover gain" },
        ],
        canopyCover: [30, 50],
        years: [
          { start: 2020, end: 2023 },
          { start: 2024, end: 2024 },
        ],
      })
    );
    expect(rendered(chips)).toEqual([
      "AREA Pará, Brazil",
      "AREA Acre, Brazil",
      "DATA Tree cover loss",
      "DATA Tree cover gain",
      "CANOPY > 30%",
      "CANOPY > 50%",
      "YEARS 2020–23",
      "YEAR 2024",
    ]);
  });

  it("folds the areas past the third into one +N chip that names them", () => {
    const names = ["A", "B", "C", "D", "E"];
    const chips = buildChips(
      inputs({ areas: names.map((name) => ({ name })) })
    );
    expect(rendered(chips)).toEqual(["AREA A", "AREA B", "AREA C", "AREA +2"]);
    expect(chips[3].tooltip).toBe("D · E");
  });

  it("lists every area when the limit is lifted, as print does", () => {
    const names = ["A", "B", "C", "D"];
    const chips = buildChips(
      inputs({ areas: names.map((name) => ({ name })) }),
      Infinity
    );
    expect(rendered(chips)).toEqual(["AREA A", "AREA B", "AREA C", "AREA D"]);
  });

  it("renders an LGMS analysis over the years its data covers", () => {
    // PZB-1355: the row read "YEARS 2001–25" over a chart of 2016–2024
    // figures. The years now come from the record of what was analysed.
    const chips = buildChips(
      inputs({
        areas: [{ name: "Pará, Brazil", source: "gadm", srcId: "BRA.14" }],
        datasets: [{ name: "Land GHG Monitoring System (LGMS)" }],
        years: [{ start: 2016, end: 2024 }],
      })
    );
    expect(rendered(chips)).toEqual([
      "AREA Pará, Brazil",
      "DATA LGMS net flux",
      "YEARS 2016–24",
    ]);
  });
});
