import { describe, expect, it } from "vitest";
import {
  CURATED_ANALYSIS_DATASET_IDS,
  CURATED_ANALYSIS_TEMPLATES,
} from "../curated-analyses";

describe("CURATED_ANALYSIS_TEMPLATES", () => {
  it("has one template per analyzable dataset, in registry order", () => {
    expect(CURATED_ANALYSIS_TEMPLATES.map((t) => t.datasetId)).toEqual([
      ...CURATED_ANALYSIS_DATASET_IDS,
    ]);
  });

  it("resolves names from the dataset catalogue", () => {
    const byId = new Map(
      CURATED_ANALYSIS_TEMPLATES.map((t) => [t.datasetId, t])
    );
    expect(byId.get(4)?.datasetName).toBe("Tree cover loss");
    expect(byId.get(11)?.datasetName).toBe("Integrated alerts");
  });

  it("uses the catalogue's default years when pinned, else the shared window", () => {
    const byId = new Map(
      CURATED_ANALYSIS_TEMPLATES.map((t) => [t.datasetId, t])
    );
    // Tree cover loss pins defaultStartYear/defaultEndYear in the catalogue.
    expect(byId.get(4)?.startDate).toBe("2001-01-01");
    expect(byId.get(4)?.endDate).toBe("2025-12-31");
    // Integrated alerts has no pinned years → shared default window.
    expect(byId.get(11)?.startDate).toBe("2001-01-01");
    expect(byId.get(11)?.endDate).toBe("2025-12-31");
  });

  it("has a valid ISO date window in every template", () => {
    for (const template of CURATED_ANALYSIS_TEMPLATES) {
      expect(template.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(template.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(template.startDate <= template.endDate).toBe(true);
    }
  });
});
