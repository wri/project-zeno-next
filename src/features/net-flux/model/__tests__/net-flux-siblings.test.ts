import { describe, expect, it } from "vitest";
import {
  collapseNetFluxRollups,
  collapseNetFluxSiblings,
  defaultNetFluxSibling,
  netFluxDetailLabel,
  netFluxWidgetDetailPillLabel,
  netFluxGroupKey,
  netFluxRollups,
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
        ...chart("ins1-chart-0", "LGMS total net GHG flux in Peru"),
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
    ...chart("ins1-chart-0", "LGMS total net GHG flux in Peru"),
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
  it("orders tabs Summary → Category → Full", () => {
    expect(netFluxSiblings(ANALYSIS, FULL).map((w) => w.id)).toEqual([
      "ins1-chart-2",
      "ins1-chart-1",
      "ins1-chart-0",
    ]);
  });

  it("orders a partial group the same way", () => {
    const partial = [FULL, SUMMARY];
    expect(netFluxSiblings(partial, SUMMARY).map((w) => w.id)).toEqual([
      "ins1-chart-2",
      "ins1-chart-0",
    ]);
  });

  it("sorts a detail it doesn't recognise after the known three", () => {
    const odd = chart("ins1-chart-4", "Net GHG Flux — Experimental");
    expect(
      netFluxSiblings([odd, FULL, CATEGORY, SUMMARY], FULL).map((w) => w.id)
    ).toEqual(["ins1-chart-2", "ins1-chart-1", "ins1-chart-0", "ins1-chart-4"]);
  });

  it("returns just the widget when it has no group", () => {
    expect(netFluxSiblings(ANALYSIS, TREE)).toEqual([TREE]);
  });
});

describe("defaultNetFluxSibling", () => {
  it("opens on Category wherever it sits in the group", () => {
    expect(defaultNetFluxSibling([FULL, SUMMARY, CATEGORY])).toBe(CATEGORY);
  });

  it("falls back to the first in display order when Category is missing", () => {
    // Unsorted on purpose: the default must not depend on the caller sorting.
    expect(defaultNetFluxSibling([FULL, SUMMARY])).toBe(SUMMARY);
  });

  it("is undefined for an empty group", () => {
    expect(defaultNetFluxSibling([])).toBeUndefined();
  });
});

describe("collapseNetFluxSiblings", () => {
  it("opens a group without Category on its first roll-up in display order", () => {
    expect(
      collapseNetFluxSiblings([FULL, SUMMARY], {}).map((w) => w.id)
    ).toEqual(["ins1-chart-2"]);
  });

  it("folds the three roll-ups into one entry, defaulting to Category", () => {
    const out = collapseNetFluxSiblings(ANALYSIS, {});
    expect(out.map((w) => w.id)).toEqual([
      "ins1-chart-1", // the group, represented by Category
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

  it("falls back to the default detail if the selection is stale", () => {
    const out = collapseNetFluxSiblings(ANALYSIS, { ins1: "deleted-chart" });
    expect(out[0].id).toBe("ins1-chart-1");
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
      "ins1-chart-1", // unselected group opens on Category
      "ins1-chart-3",
      "ins2-chart-0",
      "ins9-chart-1",
    ]);
  });

  it("leaves a list with no net-flux charts untouched", () => {
    expect(collapseNetFluxSiblings([OTHER, TREE], {})).toEqual([OTHER, TREE]);
  });
});

// The same analysis as it arrives off the dashboards API and the stored
// insights list: backend chart UUIDs, so no `chartBatchKey` prefix to group by.
const UUID_TREE = chart("d4e5f6", "Net GHG Flux — Annual Average", "bar");
const UUID_FULL = chart("a1b2c3", "Net GHG Flux — Full Detail");
const UUID_CATEGORY = chart("b2c3d4", "Net GHG Flux by Category");
const UUID_SUMMARY = chart("c3d4e5", "Net GHG Flux Summary");
const UUID_ANALYSIS = [UUID_TREE, UUID_FULL, UUID_CATEGORY, UUID_SUMMARY];

describe("netFluxRollups", () => {
  it("lists one analysis's roll-ups in display order, whatever the ids", () => {
    expect(netFluxRollups(UUID_ANALYSIS)).toEqual([
      UUID_SUMMARY,
      UUID_CATEGORY,
      UUID_FULL,
    ]);
  });

  it("ignores charts that are not time series", () => {
    expect(netFluxRollups([UUID_TREE])).toEqual([]);
  });
});

describe("collapseNetFluxRollups", () => {
  it("folds the roll-ups to the selected one, keeping their place in the order", () => {
    expect(collapseNetFluxRollups(UUID_ANALYSIS, UUID_SUMMARY.id)).toEqual([
      UUID_TREE,
      UUID_SUMMARY,
    ]);
  });

  it("falls back to the lead roll-up when nothing is selected", () => {
    expect(collapseNetFluxRollups(UUID_ANALYSIS)).toEqual([
      UUID_TREE,
      UUID_SUMMARY,
    ]);
  });

  it("falls back to the lead roll-up when the selection is not one of them", () => {
    expect(collapseNetFluxRollups(UUID_ANALYSIS, "gone")).toEqual([
      UUID_TREE,
      UUID_SUMMARY,
    ]);
  });

  it("leaves an analysis with a single roll-up, or none, untouched", () => {
    expect(collapseNetFluxRollups([UUID_TREE, UUID_FULL])).toEqual([
      UUID_TREE,
      UUID_FULL,
    ]);
    expect(collapseNetFluxRollups([UUID_TREE])).toEqual([UUID_TREE]);
  });
});
