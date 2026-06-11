import { describe, it, expect } from "vitest";
import { buildChips } from "../analysis-params-utils";

describe("buildChips", () => {
  it("uses the short label for a dataset that defines one", () => {
    const chips = buildChips({
      dataset: "Global natural/semi-natural grassland extent",
    });
    const data = chips.find((c) => c.label === "DATA");
    expect(data?.value).toBe("Grasslands");
  });

  it("falls back to the full name when no short label is defined", () => {
    const chips = buildChips({ dataset: "Tree cover loss" });
    const data = chips.find((c) => c.label === "DATA");
    expect(data?.value).toBe("Tree cover loss");
  });

  it("leaves an unknown dataset name unchanged", () => {
    const chips = buildChips({ dataset: "Some custom layer" });
    const data = chips.find((c) => c.label === "DATA");
    expect(data?.value).toBe("Some custom layer");
  });

  it("builds one AREA chip per area plus canopy and year chips", () => {
    const chips = buildChips({
      areas: ["Pará, Brazil", "Acre, Brazil"],
      canopyThreshold: 30,
      startYear: 2020,
      endYear: 2023,
    });
    expect(chips.filter((c) => c.label === "AREA").map((c) => c.value)).toEqual(
      ["Pará, Brazil", "Acre, Brazil"]
    );
    expect(chips.find((c) => c.label === "CANOPY")?.value).toBe("> 30%");
    expect(chips.find((c) => c.label === "YEARS")?.value).toBe("2020–23");
  });
});
