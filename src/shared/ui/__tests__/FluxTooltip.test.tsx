// @vitest-environment happy-dom
import type { ReactElement, ReactNode } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FluxTooltipRow } from "@/src/shared/lib/flux-tooltip";

import { FluxTooltip } from "../FluxTooltip";

const Providers = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
);
const renderTooltip = (ui: ReactElement) => render(ui, { wrapper: Providers });

const ROWS: FluxTooltipRow[] = [
  { key: "emissions", label: "Emissions", value: 1600, color: "#bf812d" },
  { key: "removals", label: "Removals", value: -750, color: "#01665e" },
];

describe("FluxTooltip", () => {
  it("prints the title, the rows in order, then the total — signed and unitless", () => {
    const { container } = renderTooltip(
      <FluxTooltip
        title="Vegetation"
        rows={ROWS}
        total={{ label: "Net flux", value: 850 }}
      />
    );

    expect(container.textContent).toBe(
      "VegetationEmissions+1,600Removals-750Net flux+850"
    );
  });

  it("renders a tinted total alone, with its swatch, when there are no rows", () => {
    const { container } = renderTooltip(
      <FluxTooltip
        title="2020"
        rows={[]}
        total={{ label: "Net sink", value: -120, color: "url(#hatch)" }}
      />
    );

    expect(container.textContent).toBe("2020Net sink-120");
    expect(container.querySelector("svg rect")?.getAttribute("fill")).toBe(
      "url(#hatch)"
    );
  });

  it("omits the heading and the swatch when neither a title nor a tint is given", () => {
    renderTooltip(
      <FluxTooltip rows={[]} total={{ label: "Net flux", value: 850 }} />
    );

    const line = screen.getByText("Net flux").parentElement;
    expect(line?.textContent).toBe("Net flux+850");
    // Label and value only — no swatch box before them.
    expect(line?.childElementCount).toBe(2);
  });

  it("renders nothing when there is neither a row nor a total", () => {
    const { container } = renderTooltip(
      <FluxTooltip title="2020" rows={[]} total={null} />
    );

    expect(container.textContent).toBe("");
  });
});
