// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Popup needs a live map context; stub it to render its children inline.
vi.mock("react-map-gl/maplibre", () => ({
  Popup: ({ children }: { children: ReactNode }) => children,
}));

import useSelectionStore from "../selection-store";
import { AnalysisCTA } from "../AnalysisCTA";

const renderCTA = (ui: ReactElement) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);

describe("AnalysisCTA", () => {
  beforeEach(() => {
    useSelectionStore.getState().clear();
  });

  it("renders nothing when there is no selection", () => {
    renderCTA(<AnalysisCTA />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the selection's name and Analyze action", () => {
    useSelectionStore
      .getState()
      .select(
        { name: "Brazil", source: "gadm", srcId: "BRA" },
        { lng: -51.9, lat: -14.2 }
      );

    renderCTA(<AnalysisCTA />);

    expect(screen.getByText("Brazil")).toBeTruthy();
    expect(screen.getByRole("button", { name: /analyze/i })).toBeTruthy();
  });
});
