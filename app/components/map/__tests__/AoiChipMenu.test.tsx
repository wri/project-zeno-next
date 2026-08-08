// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AoiActions } from "../useAoiActions";

let actions: AoiActions | null;
vi.mock("../useAoiActions", () => ({
  useAoiActions: () => actions,
}));

import AoiChipMenu from "../AoiChipMenu";

const baseActions = (): AoiActions => ({
  areaName: "Paraná, Brazil",
  hasDataset: true,
  canSaveArea: true,
  canUseDashboard: true,
  dashboardLabel: "Create Dashboard",
  isCreatingDashboard: false,
  isSavingArea: false,
  generateInsights: vi.fn(),
  viewAnalysis: vi.fn(),
  openOrCreateDashboard: vi.fn(),
  saveArea: vi.fn().mockResolvedValue(undefined),
  removeFromMap: vi.fn(),
});

const renderMenu = () =>
  render(
    <ChakraProvider value={defaultSystem}>
      <AoiChipMenu />
    </ChakraProvider>
  );

// Ark UI (Chakra v3) opens a menu on pointerdown, not click.
const openMenu = async () => {
  const trigger = screen.getByRole("button", {
    name: /Actions for Paraná, Brazil/i,
  });
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: "mouse" });
  fireEvent.click(trigger);
  await screen.findByRole("menu");
};

describe("AoiChipMenu", () => {
  beforeEach(() => {
    actions = baseActions();
  });

  it("renders nothing with no area selected", () => {
    actions = null;
    expect(renderMenu().container.innerHTML).toBe("");
  });

  it("shows the selected area's name", () => {
    renderMenu();
    expect(screen.getByText("Paraná, Brazil")).toBeTruthy();
  });

  it("offers all five actions when everything is available", async () => {
    renderMenu();
    await openMenu();

    for (const label of [
      "Generate Insights",
      "View Analysis",
      "Create Dashboard",
      "Save Area",
      "Remove from map",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("hides the analysis pair when no dataset is active", async () => {
    actions = { ...baseActions(), hasDataset: false };
    renderMenu();
    await openMenu();

    expect(screen.queryByText("Generate Insights")).toBeNull();
    expect(screen.queryByText("View Analysis")).toBeNull();
    expect(screen.getByText("Create Dashboard")).toBeTruthy();
  });

  it("hides the dashboard item when it isn't available", async () => {
    actions = { ...baseActions(), canUseDashboard: false };
    renderMenu();
    await openMenu();

    expect(screen.queryByText("Create Dashboard")).toBeNull();
    expect(screen.getByText("Save Area")).toBeTruthy();
  });

  it("hides Save Area for an area the user already owns", async () => {
    actions = { ...baseActions(), canSaveArea: false };
    renderMenu();
    await openMenu();

    expect(screen.queryByText("Save Area")).toBeNull();
    expect(screen.getByText("Remove from map")).toBeTruthy();
  });

  it("shows the Open label when a dashboard already exists", async () => {
    actions = { ...baseActions(), dashboardLabel: "Open Dashboard" };
    renderMenu();
    await openMenu();

    expect(screen.getByText("Open Dashboard")).toBeTruthy();
    expect(screen.queryByText("Create Dashboard")).toBeNull();
  });

  it("removes the area from the map via the chip's close button", () => {
    renderMenu();

    fireEvent.click(
      screen.getByRole("button", { name: /Remove Paraná, Brazil from map/i })
    );

    expect(actions!.removeFromMap).toHaveBeenCalled();
  });
});
