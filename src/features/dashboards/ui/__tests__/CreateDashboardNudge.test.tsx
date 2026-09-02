// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listDashboards: vi.fn(),
  createDashboard: vi.fn(),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/src/features/analysis", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  analysisService: { run: vi.fn() },
}));

import { analysisService } from "@/src/features/analysis";
import { createDashboard, listDashboards } from "../../api/dashboards";
import type { Dashboard } from "../../api/schemas";
import type { CreateDashboardSuggestion } from "@/app/types/chat";
import useChatStore from "@/app/store/chatStore";
import CreateDashboardNudge from "../CreateDashboardNudge";

const suggestion: CreateDashboardSuggestion = {
  areaName: "Paraná, Brazil",
  source: "gadm",
  srcId: "BRA.16_1",
  subtype: "state-province",
  datasetId: 4,
  datasetName: "Tree cover loss",
  startDate: "2001-01-01",
  endDate: "2025-12-31",
};

function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: "dash-1",
    user_id: "u1",
    name: "Paraná, Brazil",
    is_public: false,
    created_at: "2026-08-07T00:00:00Z",
    updated_at: "2026-08-07T00:00:00Z",
    aois: [
      {
        id: "a1",
        position: 0,
        source: "gadm",
        src_id: "BRA.16_1",
        subtype: "state-province",
        name: "Paraná, Brazil",
      },
    ],
    sections: [],
    widgets: [],
    ...overrides,
  };
}

const renderNudge = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>
    </QueryClientProvider>
  );
};

describe("CreateDashboardNudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().reset();
    vi.mocked(listDashboards).mockResolvedValue([]);
    vi.mocked(createDashboard).mockResolvedValue(dashboard());
    vi.mocked(analysisService.run).mockResolvedValue({
      id: "insight-1",
      charts: [],
    });
  });

  it("offers to create when the area has no dashboard", async () => {
    renderNudge(<CreateDashboardNudge suggestion={suggestion} />);

    const button = await screen.findByRole("button", {
      name: /Create Dashboard for Paraná, Brazil/i,
    });
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(false)
    );
  });

  it("offers to open when the area already has one", async () => {
    vi.mocked(listDashboards).mockResolvedValue([dashboard()]);

    renderNudge(<CreateDashboardNudge suggestion={suggestion} />);

    await screen.findByRole("button", {
      name: /Open Paraná, Brazil Dashboard/i,
    });
  });

  it("navigates to the existing dashboard, without creating one", async () => {
    vi.mocked(listDashboards).mockResolvedValue([dashboard()]);
    renderNudge(<CreateDashboardNudge suggestion={suggestion} />);

    const button = await screen.findByRole("button", {
      name: /Open Paraná, Brazil Dashboard/i,
    });
    fireEvent.click(button);

    expect(push).toHaveBeenCalledWith("/dashboards/dash-1");
    expect(createDashboard).not.toHaveBeenCalled();
  });

  it("creates a dashboard and surfaces its card", async () => {
    renderNudge(<CreateDashboardNudge suggestion={suggestion} />);

    const button = await screen.findByRole("button", {
      name: /Create Dashboard for Paraná, Brazil/i,
    });
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(button);

    await waitFor(() => expect(createDashboard).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        useChatStore
          .getState()
          .messages.filter((m) => m.type === "dashboard-card")
      ).toHaveLength(1)
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("is disabled until the dashboards list resolves", () => {
    vi.mocked(listDashboards).mockReturnValue(new Promise(() => {}));

    renderNudge(<CreateDashboardNudge suggestion={suggestion} />);

    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true
    );
  });
});
