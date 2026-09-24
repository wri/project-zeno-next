// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { InsightWidget } from "@/app/types/chat";
import {
  CATEGORY_WIDGET,
  DETAIL_LEVEL_WIDGETS,
  FULL_DETAIL_WIDGET,
} from "../../model/__tests__/fixtures";
import {
  deriveNetFluxVariant,
  type NetFluxMeasure,
} from "../../model/net-flux-variants";
import { NetFluxLegend } from "../NetFluxLegend";

function renderLegend(w: InsightWidget, measure: NetFluxMeasure = "gross") {
  const { legend } = deriveNetFluxVariant(w, measure);
  render(
    <ChakraProvider value={defaultSystem}>
      <NetFluxLegend legend={legend} />
    </ChakraProvider>
  );
  return legend;
}

const infoIcons = () => screen.queryAllByRole("img", { name: /^About / });

describe("NetFluxLegend info icons", () => {
  it.each(DETAIL_LEVEL_WIDGETS)(
    "%s: every legend entry gets an info icon named for it",
    (_, w) => {
      const legend = renderLegend(w);
      const entries = [...legend.emissions, ...legend.removals];
      // One icon per entry — a class drawn on both sides has one per side.
      expect(infoIcons()).toHaveLength(entries.length);
      for (const { label } of entries) {
        expect(
          screen.getAllByRole("img", { name: `About ${label}` }).length
        ).toBeGreaterThan(0);
      }
    }
  );

  it("leaves the net measure's sign entries and the net-flux line without one", () => {
    renderLegend(CATEGORY_WIDGET, "net");
    expect(infoIcons()).toHaveLength(0);
    expect(screen.getByText("Net source (+)")).toBeTruthy();
    expect(screen.getByText("Net flux")).toBeTruthy();
  });

  it("leaves an entry the copy doesn't cover without one, rather than empty", () => {
    // A class the backend might add that the descriptions don't cover yet.
    renderLegend({
      ...FULL_DETAIL_WIDGET,
      seriesFields: ["peat_burning_emissions", "tree_gain_removals"],
      data: [{ year: 2020, peat_burning_emissions: 1, tree_gain_removals: -1 }],
    });
    expect(
      screen.queryByRole("img", { name: "About peat burning" })
    ).toBeNull();
    expect(screen.getByText("peat burning")).toBeTruthy();
    expect(screen.getByRole("img", { name: "About Tree gain" })).toBeTruthy();
  });
});
