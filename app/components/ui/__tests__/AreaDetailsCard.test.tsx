// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BoundaryFeatureDetails } from "@/app/utils/boundaryFeatureDetails";

import { AreaDetailsCard } from "../AreaTooltip";

function renderCard(details: BoundaryFeatureDetails) {
  render(
    <ChakraProvider value={defaultSystem}>
      <AreaDetailsCard details={details} />
    </ChakraProvider>
  );
}

const reserve: BoundaryFeatureDetails = {
  kind: "Biological Reserve",
  title: "Reserva Biológica Do Tapirapé",
  status: "Designated 1989",
  rows: [
    { label: "IUCN category", value: "Ia" },
    { label: "Area", value: "99.3K ha" },
  ],
  source: "World Database on Protected Areas",
};

describe("AreaDetailsCard", () => {
  it("renders the eyebrow, title, status, rows, source and pick hint", () => {
    renderCard(reserve);

    expect(screen.getByText("AREA")).toBeTruthy();
    expect(screen.getByText(/Biological Reserve/)).toBeTruthy();
    expect(screen.getByText("Reserva Biológica Do Tapirapé")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Designated 1989")).toBeTruthy();
    expect(screen.getByText("IUCN category")).toBeTruthy();
    expect(screen.getByText("99.3K ha")).toBeTruthy();
    expect(
      screen.getByText("Source: World Database on Protected Areas")
    ).toBeTruthy();
    expect(screen.getByText("Click to select this area")).toBeTruthy();
  });

  it("omits the status row when there is no status", () => {
    renderCard({ ...reserve, status: undefined, rows: [] });

    expect(screen.queryByText("Status")).toBeNull();
    expect(screen.getByText("Reserva Biológica Do Tapirapé")).toBeTruthy();
  });
});
