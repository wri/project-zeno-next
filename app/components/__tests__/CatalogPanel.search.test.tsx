// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// layerManagerSlice dynamically imports chatStore; stub it, and let the import
// settle before teardown (see CatalogPanel.supporting-layers.test.tsx).
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));
afterEach(() => vi.dynamicImportSettled());

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

// Pinning or unpinning moves the row to the other list, which remounts it;
// a keyboard user must stay on the switch they just pressed.
describe("Data Catalog panel — keyboard focus across a move", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useSidebarStore.setState({ dataCatalogOpen: true, isChatFullSize: true });
    window.history.replaceState({}, "", "/");
  });

  const switchFor = (ariaLabel: string) =>
    within(screen.getByLabelText(ariaLabel)).getByRole(
      "checkbox"
    ) as HTMLInputElement;

  /** Focus a switch, then press it (a click on the focused input). */
  async function press(ariaLabel: string) {
    const input = switchFor(ariaLabel);
    await act(async () => {
      input.focus();
      fireEvent.click(input);
    });
  }

  it("keeps focus on the switch when pinning a dataset under On map", async () => {
    renderPanel();
    await press("Show Tree cover loss on map");

    expect(
      within(screen.getByRole("region", { name: "On map" })).getByText(
        "Tree cover loss"
      )
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      switchFor("Hide Tree cover loss from map")
    );
  });

  it("keeps focus on the switch when unpinning the last dataset", async () => {
    renderPanel();
    await turnOn("Tree cover loss");
    await press("Hide Tree cover loss from map");

    expect(screen.queryByRole("region", { name: "On map" })).toBeNull();
    expect(document.activeElement).toBe(
      switchFor("Show Tree cover loss on map")
    );
  });

  it("keeps focus on a supporting layer's switch when it puts the dataset on", async () => {
    window.history.replaceState({}, "", "/?ff=net-flux");
    renderPanel();
    await press("Show LGMS LULUCF net GHG flux on map");

    expect(
      within(screen.getByRole("region", { name: "On map" })).getByText(
        "Land GHG Monitoring System (LGMS)"
      )
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      switchFor("Hide LGMS LULUCF net GHG flux from map")
    );
  });

  it("leaves focus alone when the switch did not have it", async () => {
    renderPanel();
    searchBox().focus();
    await turnOn("Tree cover loss");

    expect(document.activeElement).toBe(searchBox());
  });
});
