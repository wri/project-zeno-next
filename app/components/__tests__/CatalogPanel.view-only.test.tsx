// @vitest-environment happy-dom
/**
 * View-only datasets (no analytics endpoint) are still datasets: their
 * catalogue card keeps the DATA type label, and VIEW ONLY is a separate badge
 * in the card header rather than a replacement for the label.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// See CatalogPanel.supporting-layers.test.tsx: keeps the store round-trip
// independent of chatStore's own import chain.
vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ includeLayerInContext: () => {} }) },
}));

import DataCatalogPanel from "../CatalogPanel";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";

/** The card root: the nearest ancestor that also holds the show-on-map switch. */
function cardFor(title: string): HTMLElement {
  let el: HTMLElement | null = screen.getByText(title);
  while (el && !el.querySelector('input[type="checkbox"]')) {
    el = el.parentElement;
  }
  if (!el) throw new Error(`No card found for ${title}`);
  return el;
}

describe("Data Catalog panel — view-only datasets", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useSidebarStore.setState({ dataCatalogOpen: true, isChatFullSize: true });
    // Intact Forest Landscapes is the standalone view-only card; it is still
    // behind `?ff=ifl` on this branch.
    window.history.replaceState({}, "", "/?ff=ifl");
  });

  it("labels a view-only card DATA and badges it VIEW ONLY", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataCatalogPanel />
      </ChakraProvider>
    );

    const card = cardFor("Intact Forest Landscapes");
    expect(card.textContent).toContain("DATA");
    expect(card.textContent).toContain("VIEW ONLY");
  });

  it("does not badge an analysable dataset", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataCatalogPanel />
      </ChakraProvider>
    );

    const card = cardFor("Tree cover loss");
    expect(card.textContent).toContain("DATA");
    expect(card.textContent).not.toContain("VIEW ONLY");
  });
});
