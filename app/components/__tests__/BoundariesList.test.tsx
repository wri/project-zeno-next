// @vitest-environment happy-dom
/**
 * Boundaries tab of the Areas panel: boundary layers (admin areas, KBAs,
 * protected areas, indigenous lands) are shown one at a time, and showing one
 * is NOT an area selection — it must never touch `mapStore.layers`, which is
 * what `deriveContext` reads to build `ui_context`.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useMapStore from "@/app/store/mapStore";

import { BoundariesList } from "../BoundariesList";

// Zag's switch ignores synthetic clicks under happy-dom, so stand the card in
// with a plain toggle button that drives the same `onShowOnMapChange` contract.
vi.mock("../CatalogCard", () => ({
  CatalogCard: (props: {
    title: string;
    showOnMap: boolean;
    onShowOnMapChange: (checked: boolean) => void;
  }) => (
    <button
      aria-pressed={props.showOnMap}
      onClick={() => props.onShowOnMapChange(!props.showOnMap)}
    >
      {props.title}
    </button>
  ),
}));

const NAMES = [
  "Administrative Areas",
  "Key Biodiversity Areas",
  "Protected Areas",
  "Indigenous Lands",
];

function renderList() {
  render(
    <ChakraProvider value={defaultSystem}>
      <BoundariesList />
    </ChakraProvider>
  );
}

const card = (name: string) => screen.getByRole("button", { name });
const isOn = (name: string) =>
  card(name).getAttribute("aria-pressed") === "true";

describe("BoundariesList", () => {
  beforeEach(() => {
    useMapStore.setState({
      selectAreaLayer: "GADM",
      layers: [],
      geoJsonRegistry: [],
    });
  });

  it("lists every boundary layer and no Custom Areas option", () => {
    renderList();

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(
      NAMES
    );
    expect(screen.queryByText("Custom Areas")).toBeNull();
  });

  it("shows Administrative Areas on the map by default", () => {
    renderList();

    expect(isOn("Administrative Areas")).toBe(true);
    expect(NAMES.slice(1).some(isOn)).toBe(false);
  });

  it("allows only one boundary layer at a time", () => {
    renderList();

    fireEvent.click(card("Protected Areas"));

    expect(useMapStore.getState().selectAreaLayer).toBe("WDPA");
    expect(isOn("Protected Areas")).toBe(true);
    expect(isOn("Administrative Areas")).toBe(false);
  });

  it("turns the boundary layer off when its active toggle is switched off", () => {
    renderList();

    fireEvent.click(card("Administrative Areas"));

    expect(useMapStore.getState().selectAreaLayer).toBeNull();
    expect(NAMES.some(isOn)).toBe(false);
  });

  it("does not add an area layer (so no ui_context) when showing a boundary layer", () => {
    renderList();

    fireEvent.click(card("Key Biodiversity Areas"));

    expect(useMapStore.getState().layers).toEqual([]);
  });
});
