// @vitest-environment happy-dom
import type { ComponentProps } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { visibleRows, type FluxNode } from "../../model/hierarchy";
import { TreeTooltipContent } from "../GhgFluxTreeChart";

const NODES: FluxNode[] = [
  {
    id: "all",
    parentId: null,
    label: "All land",
    avgEmissions: 1600,
    avgRemovals: -750,
  },
  {
    id: "soil",
    parentId: "all",
    label: "Soil",
    avgEmissions: 530,
    avgRemovals: null,
  },
];
const rows = visibleRows(NODES, new Set(["all"]));

/** What recharts hands the content for a hovered bar: the row's data item. */
const payloadFor = (id: string) => [
  { payload: { id, avgEmissions: null, avgRemovals: null, net: null } },
];

function renderContent(
  props: Partial<ComponentProps<typeof TreeTooltipContent>>
) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <TreeTooltipContent rows={rows} measure="gross" {...props} />
    </ChakraProvider>
  );
}

describe("TreeTooltipContent", () => {
  it("renders the hovered row's panel when recharts says the tooltip is active", () => {
    const { container } = renderContent({
      active: true,
      payload: payloadFor("soil"),
    });
    expect(container.textContent).toBe("SoilEmissions+530Net flux+530");
  });

  it("renders nothing when recharts reports the tooltip inactive", () => {
    // The pointer inside the chart but off the plot (axis strip, margins):
    // recharts reports inactive; the panel must follow that, not the payload.
    const { container } = renderContent({
      active: false,
      payload: payloadFor("soil"),
    });
    expect(container.textContent).toBe("");
  });
});
