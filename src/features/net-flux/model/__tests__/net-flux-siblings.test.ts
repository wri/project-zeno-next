import { describe, expect, it } from "vitest";
import {
  collapseNetFluxSiblings,
  netFluxDetailLabel,
  netFluxWidgetDetailPillLabel,
  netFluxGroupKey,
  netFluxSiblings,
  netFluxWidgetDetailLabel,
} from "../net-flux-siblings";
import type { InsightWidget } from "@/app/types/chat";

const chart = (
  id: string,
  title: string,
  type: InsightWidget["type"] = "stacked-bar-with-line"
): InsightWidget => ({
  id,
  type,
  title,
  description: "",
  xAxis: "year",
  yAxis: "",
  data: [],
});

// One LGMS analysis: three time-series roll-ups plus the annual-average
// chart, ided the way RestAnalysisGateway does (`{insightId}-chart-{n}`).
const FULL = chart("ins1-chart-0", "Net GHG Flux — Full Detail");
const CATEGORY = chart("ins1-chart-1", "Net GHG Flux by Category");
const SUMMARY = chart("ins1-chart-2", "Net GHG Flux Summary");
// The generator sends this one as "hierarchical-bar", a type this branch
// doesn't know, so `chartsToWidgets` falls it back to "bar" (PZB-1248 adds the
// type). Either way it is not this slice's chart and must not join the group.
const TREE = chart("ins1-chart-3", "Net GHG Flux — Annual Average", "bar");
const OTHER = chart("ins2-chart-0", "Tree cover loss", "bar");

const ANALYSIS = [FULL, CATEGORY, SUMMARY, TREE, OTHER];

describe("netFluxGroupKey", () => {
  it("groups the time-series charts of one analysis by their id prefix", () => {
    expect(netFluxGroupKey(FULL)).toBe("ins1");
    expect(netFluxGroupKey(CATEGORY)).toBe("ins1");
    expect(netFluxGroupKey(SUMMARY)).toBe("ins1");
  });

  it("excludes charts that aren't this slice's type", () => {
    // Same analysis, but the hierarchy chart is rendered by its own slice.
    expect(netFluxGroupKey(TREE)).toBeNull();
    expect(netFluxGroupKey(OTHER)).toBeNull();
  });

  it("returns null when the id doesn't carry the chart suffix", () => {
    // e.g. an insight rehydrated from history under a different id scheme.
    expect(
      netFluxGroupKey(chart("legacy-id", "Net GHG Flux Summary"))
    ).toBeNull();
    const noId = { ...FULL, id: undefined };
    expect(netFluxGroupKey(noId)).toBeNull();
  });
});

describe("netFluxDetailLabel", () => {
  it("reads the detail off the backend's own titles, in sentence case", () => {
    expect(netFluxDetailLabel("Net GHG Flux — Full Detail")).toBe(
      "Full detail"
    );
    expect(netFluxDetailLabel("Net GHG Flux by Category")).toBe("Category");
    expect(netFluxDetailLabel("Net GHG Flux Summary")).toBe("Summary");
  });

  it("falls back to the whole title when it recognises nothing", () => {
    expect(netFluxDetailLabel("Something else")).toBe("Something else");
  });
});

describe("netFluxWidgetDetailPillLabel", () => {
  it("abbreviates only the longest option, as the design's pill does", () => {
    const pill = (backendTitle: string) =>
      netFluxWidgetDetailPillLabel({
        ...chart("ins1-chart-0", "Land GHG Monitoring System (LGMS) in Peru"),
        backendTitle,
      });
    expect(pill("Net GHG Flux — Full Detail")).toBe("Full");
    expect(pill("Net GHG Flux by Category")).toBe("Category");
    expect(pill("Net GHG Flux Summary")).toBe("Summary");
  });
});

describe("netFluxWidgetDetailLabel", () => {
  // useAnalysis overwrites every chart's title with one "{dataset} in
  // {location}" string, so all three roll-ups would otherwise read alike.
  const overridden = (backendTitle: string): InsightWidget => ({
    ...chart("ins1-chart-0", "Land GHG Monitoring System (LGMS) in Peru"),
    backendTitle,
  });

  it("reads the backend title through the display-title override", () => {
    expect(
      netFluxWidgetDetailLabel(overridden("Net GHG Flux — Full Detail"))
    ).toBe("Full detail");
    expect(
      netFluxWidgetDetailLabel(overridden("Net GHG Flux by Category"))
    ).toBe("Category");
    expect(netFluxWidgetDetailLabel(overridden("Net GHG Flux Summary"))).toBe(
      "Summary"
    );
  });

  it("gives the three roll-ups distinct labels", () => {
    const labels = [
      "Net GHG Flux — Full Detail",
      "Net GHG Flux by Category",
      "Net GHG Flux Summary",
    ].map((t) => netFluxWidgetDetailLabel(overridden(t)));
    expect(new Set(labels).size).toBe(3);
  });

  it("falls back to title when no backend title was preserved", () => {
    expect(netFluxWidgetDetailLabel(FULL)).toBe("Full detail");
  });
});

describe("netFluxSiblings", () => {
  it("returns the three roll-ups, in the order the backend sent", () => {
    expect(netFluxSiblings(ANALYSIS, CATEGORY).map((w) => w.id)).toEqual([
      "ins1-chart-0",
      "ins1-chart-1",
      "ins1-chart-2",
    ]);
  });

  it("returns just the widget when it has no group", () => {
    expect(netFluxSiblings(ANALYSIS, TREE)).toEqual([TREE]);
  });
});

describe("collapseNetFluxSiblings", () => {
  it("folds the three roll-ups into one entry, defaulting to the first", () => {
    const out = collapseNetFluxSiblings(ANALYSIS, {});
    expect(out.map((w) => w.id)).toEqual([
      "ins1-chart-0", // the group, represented by Full Detail
      "ins1-chart-3", // hierarchy passes through
      "ins2-chart-0", // unrelated insight passes through
    ]);
  });

  it("represents the group by the selected sibling", () => {
    const out = collapseNetFluxSiblings(ANALYSIS, { ins1: "ins1-chart-2" });
    expect(out.map((w) => w.id)).toEqual([
      "ins1-chart-2",
      "ins1-chart-3",
      "ins2-chart-0",
    ]);
  });

  it("keeps the group in the position of its first chart", () => {
    const out = collapseNetFluxSiblings(ANALYSIS, { ins1: "ins1-chart-2" });
    expect(out[0].title).toBe("Net GHG Flux Summary");
  });

  it("falls back to the first sibling if the selection is stale", () => {
    const out = collapseNetFluxSiblings(ANALYSIS, { ins1: "deleted-chart" });
    expect(out[0].id).toBe("ins1-chart-0");
  });

  it("keeps groups from separate analyses independent", () => {
    const second = [
      chart("ins9-chart-0", "Net GHG Flux — Full Detail"),
      chart("ins9-chart-1", "Net GHG Flux by Category"),
    ];
    const out = collapseNetFluxSiblings([...ANALYSIS, ...second], {
      ins9: "ins9-chart-1",
    });
    expect(out.map((w) => w.id)).toEqual([
      "ins1-chart-0",
      "ins1-chart-3",
      "ins2-chart-0",
      "ins9-chart-1",
    ]);
  });

  it("leaves a list with no net-flux charts untouched", () => {
    expect(collapseNetFluxSiblings([OTHER, TREE], {})).toEqual([OTHER, TREE]);
  });
});
