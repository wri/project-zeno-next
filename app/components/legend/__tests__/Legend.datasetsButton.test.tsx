// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { Legend } from "../Legend";
import { LegendDatasetsButton } from "../LegendDatasetsButton";
import type { LegendLayer } from "../types";
import useSidebarStore from "@/app/store/sidebarStore";

const layer: LegendLayer = {
  id: "dataset-4",
  title: "Tree cover loss",
  opacity: 100,
  symbology: null,
};

function renderLegend(headerAction?: ReactNode) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Legend layers={[layer]} headerAction={headerAction} />
    </ChakraProvider>
  );
}

const datasetsButton = () => screen.queryByRole("button", { name: "Datasets" });

describe("Legend — Datasets button", () => {
  beforeEach(() => {
    useSidebarStore.setState({ dataCatalogOpen: false });
  });

  it("is absent unless a header action is passed (classic, mobile)", () => {
    renderLegend();
    expect(datasetsButton()).toBeNull();
  });

  it("toggles the Data Catalog, the same state the composer button uses", async () => {
    renderLegend(<LegendDatasetsButton />);

    await act(async () => {
      fireEvent.click(datasetsButton()!);
    });
    expect(useSidebarStore.getState().dataCatalogOpen).toBe(true);

    await act(async () => {
      fireEvent.click(datasetsButton()!);
    });
    expect(useSidebarStore.getState().dataCatalogOpen).toBe(false);
  });

  it("reflects whether the catalogue is open, however it was opened", async () => {
    renderLegend(<LegendDatasetsButton />);
    expect(datasetsButton()!.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      useSidebarStore.getState().setDataCatalogOpen(true);
    });
    expect(datasetsButton()!.getAttribute("aria-expanded")).toBe("true");
  });
});
