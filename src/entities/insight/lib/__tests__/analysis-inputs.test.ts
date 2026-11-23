import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisInputsWire } from "../../model/analysis-inputs";
import { soleDataset, toAnalysisInputs } from "../analysis-inputs";

type Pull = NonNullable<AnalysisInputsWire>[number];

const pull = (overrides: Partial<Pull> = {}): Pull => ({
  areas: [{ name: "Rondônia, Brazil", source: "gadm", src_id: "BRA.22" }],
  dataset_id: 4,
  dataset_name: "Tree cover loss",
  pulled_start_date: "2001-01-01",
  pulled_end_date: "2024-12-31",
  canopy_cover: 30,
  ...overrides,
});

const area = (name: string, source: string | null, src_id: string | null) => ({
  name,
  source,
  src_id,
});

describe("toAnalysisInputs", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["absent", undefined],
    ["null", null],
    ["an empty list", []],
  ])("reads %s as not recorded", (_label, raw) => {
    expect(toAnalysisInputs(raw, "ins-1")).toEqual({ recorded: false });
  });

  it("settles one full pull", () => {
    expect(toAnalysisInputs([pull()], "ins-1")).toEqual({
      recorded: true,
      areas: [
        { name: "Rondônia, Brazil", ref: { source: "gadm", srcId: "BRA.22" } },
      ],
      datasets: [{ name: "Tree cover loss", id: 4 }],
      canopyCover: [30],
      years: [{ start: 2001, end: 2024 }],
    });
  });

  it("drops the explicit nulls rather than carrying them", () => {
    const inputs = toAnalysisInputs(
      [
        pull({
          areas: [area("My drawn area", null, null)],
          dataset_id: null,
          canopy_cover: null,
        }),
      ],
      "ins-1"
    );
    expect(inputs).toEqual({
      recorded: true,
      areas: [{ name: "My drawn area" }],
      datasets: [{ name: "Tree cover loss" }],
      canopyCover: [],
      years: [{ start: 2001, end: 2024 }],
    });
  });

  it.each([
    ["natural_forest", 10],
    ["primary_forest", 30],
  ])(
    "keeps the canopy value sent under the %s context layer, ignoring the layer key",
    (layer, value) => {
      const inputs = toAnalysisInputs(
        [{ ...pull({ canopy_cover: value }), context_layer: layer }],
        "ins-1"
      );
      expect(inputs.recorded && inputs.canopyCover).toEqual([value]);
    }
  );

  it("keeps one of each distinct value across pulls, in pull order", () => {
    const inputs = toAnalysisInputs(
      [
        pull(),
        pull({ dataset_id: 9, dataset_name: "Tree cover gain" }),
        pull({ canopy_cover: 50 }),
        pull({
          pulled_start_date: "2015-01-01",
          pulled_end_date: "2020-12-31",
        }),
        pull(),
      ],
      "ins-1"
    );
    expect(inputs).toEqual({
      recorded: true,
      areas: [
        { name: "Rondônia, Brazil", ref: { source: "gadm", srcId: "BRA.22" } },
      ],
      datasets: [
        { name: "Tree cover loss", id: 4 },
        { name: "Tree cover gain", id: 9 },
      ],
      canopyCover: [30, 50],
      years: [
        { start: 2001, end: 2024 },
        { start: 2015, end: 2020 },
      ],
    });
  });

  it("tells datasets without an id apart by name", () => {
    const inputs = toAnalysisInputs(
      [
        pull({ dataset_id: null, dataset_name: "A" }),
        pull({ dataset_id: null, dataset_name: "B" }),
        pull({ dataset_id: null, dataset_name: "A" }),
      ],
      "ins-1"
    );
    expect(inputs.recorded && inputs.datasets).toEqual([
      { name: "A" },
      { name: "B" },
    ]);
  });

  it("keys areas by source and id, falling back to the name", () => {
    const inputs = toAnalysisInputs(
      [
        pull({
          areas: [
            area("Santa Cruz", "gadm", "ARG.20"),
            area("Santa Cruz", "gadm", "BOL.8"),
            area("Drawn", null, null),
          ],
        }),
        pull({
          areas: [
            area("Santa Cruz (renamed)", "gadm", "ARG.20"),
            area("Drawn", null, null),
          ],
        }),
      ],
      "ins-1"
    );
    expect(inputs.recorded && inputs.areas).toEqual([
      { name: "Santa Cruz", ref: { source: "gadm", srcId: "ARG.20" } },
      { name: "Santa Cruz", ref: { source: "gadm", srcId: "BOL.8" } },
      { name: "Drawn" },
    ]);
  });

  it("reads a payload that fails the schema as not recorded, naming the insight", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // An inner key the backend must send as an explicit null is missing.
    const sparse: Partial<Pull> = pull();
    delete sparse.canopy_cover;

    expect(toAnalysisInputs([sparse], "ins-9")).toEqual({ recorded: false });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0]).toContain("ins-9");
  });
});

describe("soleDataset", () => {
  it("is the dataset of a single-dataset analysis", () => {
    expect(soleDataset(toAnalysisInputs([pull(), pull()], "ins-1"))).toEqual({
      name: "Tree cover loss",
      id: 4,
    });
  });

  it.each([
    [
      "several datasets",
      toAnalysisInputs([pull(), pull({ dataset_id: 9 })], "x"),
    ],
    ["not recorded", toAnalysisInputs(null, "x")],
    ["no inputs", undefined],
  ])("is undefined with %s", (_label, inputs) => {
    expect(soleDataset(inputs)).toBeUndefined();
  });
});
