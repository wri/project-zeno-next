// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice dynamically imports chatStore; stub it (see
// CatalogPanel.supporting-layers.test.tsx).
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import DataCatalogPanel from "../CatalogPanel";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";

function renderPanel() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <DataCatalogPanel />
    </ChakraProvider>
  );
}

const searchBox = () =>
  screen.getByRole("textbox", { name: "Search datasets" }) as HTMLInputElement;

async function type(value: string) {
  await act(async () => {
    fireEvent.change(searchBox(), { target: { value } });
  });
}

async function pickCategory(label: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
}

async function turnOn(title: string) {
  await act(async () => {
    fireEvent.click(
      within(screen.getByLabelText(`Show ${title} on map`)).getByRole(
        "checkbox"
      )
    );
  });
}

describe("Data Catalog panel — search", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useSidebarStore.setState({ dataCatalogOpen: true, isChatFullSize: true });
    window.history.replaceState({}, "", "/");
  });

  it("narrows the list as you type", async () => {
    renderPanel();
    expect(screen.getByText("Global land cover")).toBeTruthy();

    await type("tree cover loss");

    expect(screen.getByText("Tree cover loss")).toBeTruthy();
    expect(screen.queryByText("Global land cover")).toBeNull();
  });

  it("matches category labels", async () => {
    renderPanel();
    await type("wildfire");
    expect(screen.getByText("Tree cover loss due to fires")).toBeTruthy();
  });

  it("searches within the selected category", async () => {
    renderPanel();
    await pickCategory("Forests");
    await type("land cover");

    expect(screen.queryByText("Global land cover")).toBeNull();
    expect(screen.getByText("No matches in Forests.")).toBeTruthy();
  });

  it("offers to widen to All datasets when only other categories match", async () => {
    renderPanel();
    await pickCategory("Forests");
    await type("land cover");

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /results? in All datasets/ })
      );
    });

    expect(screen.getByText("Global land cover")).toBeTruthy();
    expect(searchBox().value).toBe("land cover");
  });

  it("says nothing matches when no category has a hit", async () => {
    renderPanel();
    await type("zzzz");
    expect(screen.getByText("No datasets match “zzzz”.")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /in All datasets/ })
    ).toBeNull();
  });

  it("Escape clears the query first, then closes the panel", async () => {
    renderPanel();
    await type("alerts");

    await act(async () => {
      fireEvent.keyDown(searchBox(), { key: "Escape" });
    });
    expect(searchBox().value).toBe("");
    expect(useSidebarStore.getState().dataCatalogOpen).toBe(true);

    await act(async () => {
      fireEvent.keyDown(searchBox(), { key: "Escape" });
    });
    expect(useSidebarStore.getState().dataCatalogOpen).toBe(false);
  });
});

describe("Data Catalog panel — On map section", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useSidebarStore.setState({ dataCatalogOpen: true, isChatFullSize: true });
    window.history.replaceState({}, "", "/");
  });

  const section = (name: string) =>
    screen.getByRole("region", { name }) as HTMLElement;

  it("has no On map section or In this conversation chip when nothing is on", () => {
    renderPanel();
    expect(screen.queryByRole("region", { name: "On map" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "In this conversation" })
    ).toBeNull();
  });

  it("pins active datasets under On map without repeating them below", async () => {
    renderPanel();
    await turnOn("Tree cover loss");

    expect(within(section("On map")).getByText("Tree cover loss")).toBeTruthy();
    expect(
      within(section("All datasets")).queryByText("Tree cover loss")
    ).toBeNull();
  });

  it("filters the On map section by search too", async () => {
    renderPanel();
    await turnOn("Tree cover loss");
    await type("alerts");

    expect(screen.queryByRole("region", { name: "On map" })).toBeNull();
  });
});
