// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AoiActions, AoiActionsTarget } from "../useAoiActions";

let actions: AoiActions | null;
vi.mock("../useAoiActions", () => ({
  useAoiActions: () => actions,
}));

import AoiActionsMenu from "../AoiActionsMenu";

const target: AoiActionsTarget = {
  layerId: "Paraná, Brazil",
  areaName: "Paraná, Brazil",
  source: "GADM",
  srcId: "BRA.16_1",
  subtype: "state-province",
};

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
      <AoiActionsMenu target={target} />
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

describe("AoiActionsMenu", () => {
  beforeEach(() => {
    actions = baseActions();
  });

  it("renders nothing when the hook has no actions", () => {
    actions = null;
    expect(renderMenu().container.innerHTML).toBe("");
  });

  it("renders only a trigger until opened, not a chip with the area name", () => {
    renderMenu();

    // The label itself (name, icon, close) belongs to the bbox Tag, not here.
    expect(screen.queryByText("Paraná, Brazil")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Actions for Paraná, Brazil/i })
    ).toBeTruthy();
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
});
