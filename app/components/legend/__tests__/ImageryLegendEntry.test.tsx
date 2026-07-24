// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ImageryLegendEntry } from "../ImageryLegendEntry";
import type { ImageryLegendGroup, LayerActionArgs } from "../types";

const baseGroup: ImageryLegendGroup = {
  kind: "imagery",
  id: "imagery-group",
  title: "Satellite Imagery",
  subtitle: "Sentinel-2 · True-colour",
  opacity: 100,
  params: [
    { label: "DATES", value: "Jun 12 – Jun 16, 2026", maxValueWidth: "26ch" },
    { label: "WINDOW", value: "±30 days" },
    { label: "CLOUD", value: "< 50%" },
    { label: "AREA", value: "Paracas National Reserve" },
  ],
  info: "Sentinel-2 true-colour mosaic built from 9 scenes.",
  note: undefined,
  captures: [
    {
      layerId: "imagery-new",
      areaLabel: "Paracas National Reserve",
      dateLabel: "15 Jun 2026",
      metaLabel: "cloud <50% · 9 scenes",
      visible: true,
      live: true,
    },
    {
      layerId: "imagery-old",
      areaLabel: "Paracas National Reserve",
      dateLabel: "15 May 2026",
      metaLabel: "cloud <30% · 8 scenes",
      visible: false,
      live: false,
    },
    {
      layerId: "imagery-other",
      areaLabel: "Pacaya-Samiria",
      dateLabel: "02 Jun 2026",
      metaLabel: "cloud <30% · 6 scenes",
      visible: false,
      live: false,
    },
  ],
  areaCount: 2,
  updating: false,
};

let actions: LayerActionArgs[];

function renderEntry(overrides: Partial<ImageryLegendGroup> = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <ImageryLegendEntry
        {...baseGroup}
        {...overrides}
        expanded
        onLayerAction={(args) => actions.push(args)}
      />
    </ChakraProvider>
  );
}

describe("ImageryLegendEntry", () => {
  beforeEach(() => {
    actions = [];
  });

  it("renders title, badge, subtitle and parameter chips", () => {
    renderEntry();

    expect(screen.getByText("Satellite Imagery")).toBeDefined();
    expect(screen.getByText("Imagery")).toBeDefined();
    expect(screen.getByText("Sentinel-2 · True-colour")).toBeDefined();
    for (const label of ["DATES", "WINDOW", "CLOUD", "AREA"]) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it("collapses the captures list by default and expands it on demand", () => {
    renderEntry();

    expect(screen.getByText("3 captures · 2 areas")).toBeDefined();
    const toggle = screen.getByRole("button", { name: "Expand captures" });

    fireEvent.click(toggle);

    // "Paracas National Reserve" appears twice: the AREA chip and the
    // captures-list area header revealed by the toggle.
    expect(screen.getAllByText("Paracas National Reserve")).toHaveLength(2);
    expect(screen.getByText("Pacaya-Samiria")).toBeDefined();
    expect(screen.getByText("15 Jun 2026")).toBeDefined();
    expect(screen.getByText("LIVE")).toBeDefined();
  });

  it("renders capture toggles reflecting layer visibility", () => {
    // Zag's switch state machine cannot be actuated through happy-dom
    // synthetic events, so assert the rendered checked state; the
    // onCheckedChange → visibility-action wiring is a one-line callback.
    const { container } = renderEntry();
    fireEvent.click(screen.getByRole("button", { name: "Expand captures" }));

    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")
    );
    expect(inputs.map((i) => i.checked)).toEqual([true, false, false]);
  });

  it("fires a group remove action from the header control", () => {
    renderEntry();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove satellite imagery" })
    );

    expect(actions).toContainEqual({
      action: "remove",
      payload: { id: "imagery-group" },
    });
  });

  it("shows the updating state instead of the summary while rebuilding", () => {
    renderEntry({ updating: true });

    expect(screen.getByText("Updating mosaic…")).toBeDefined();
    expect(screen.queryByText("DATES")).toBeNull();
    expect(screen.queryByText(/captures ·/)).toBeNull();
  });

  it("pluralises the captures summary correctly for a single capture", () => {
    renderEntry({
      captures: [baseGroup.captures[0]],
      areaCount: 1,
    });

    expect(screen.getByText("1 capture · 1 area")).toBeDefined();
  });
});
