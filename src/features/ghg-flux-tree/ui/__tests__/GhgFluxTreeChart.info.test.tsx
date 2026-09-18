// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { visibleRows, type FluxNode } from "../../model/hierarchy";
import { GhgFluxTreeChart } from "../GhgFluxTreeChart";

const node = (over: Partial<FluxNode> & { id: string }): FluxNode => ({
  parentId: null,
  label: over.id,
  avgEmissions: null,
  avgRemovals: null,
  ...over,
});

const NODES: FluxNode[] = [
  node({ id: "all_land", label: "All land", avgEmissions: 1600 }),
  node({ id: "land_use", parentId: "all_land", label: "Land use" }),
  node({ id: "soil", parentId: "land_use", label: "Soil" }),
  node({ id: "mineral_soil", parentId: "soil", label: "Mineral soil" }),
  // A class the backend might add that the copy doesn't cover yet.
  node({ id: "peat_burning", parentId: "soil", label: "Peat burning" }),
];

function renderTree() {
  const expanded = new Set(["all_land", "land_use", "soil"]);
  return render(
    <ChakraProvider value={defaultSystem}>
      <GhgFluxTreeChart
        rows={visibleRows(NODES, expanded)}
        measure="net"
        onToggle={vi.fn()}
      />
    </ChakraProvider>
  );
}

describe("GhgFluxTreeChart info icons", () => {
  it("gives every described row its own info icon, named for that row", () => {
    renderTree();
    for (const label of ["All land", "Land use", "Soil", "Mineral soil"]) {
      expect(screen.getByRole("img", { name: `About ${label}` })).toBeTruthy();
    }
  });

  it("leaves a row the copy doesn't cover without one, rather than empty", () => {
    renderTree();
    expect(
      screen.queryByRole("img", { name: "About Peat burning" })
    ).toBeNull();
    // The row itself still renders — only its icon is absent.
    expect(screen.getByTitle("Peat burning")).toBeTruthy();
  });
});
