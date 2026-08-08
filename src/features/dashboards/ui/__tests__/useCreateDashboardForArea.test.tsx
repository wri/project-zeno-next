// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
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

import { toaster } from "@/app/components/ui/toaster";
import { analysisService } from "@/src/features/analysis";
import {
  addInsightWidget,
  createDashboard,
  listDashboards,
} from "../../api/dashboards";
import type { Dashboard } from "../../api/schemas";
import useChatStore from "@/app/store/chatStore";
import {
  useCreateDashboardForArea,
  type CreateDashboardForAreaInput,
} from "../useCreateDashboardForArea";

const input: CreateDashboardForAreaInput = {
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
    id: "new-dash",
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
    widgets: [],
    ...overrides,
  };
}

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const cards = () =>
  useChatStore.getState().messages.filter((m) => m.type === "dashboard-card");

describe("useCreateDashboardForArea", () => {
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

  it("reports no existing dashboard for an unseen area", async () => {
    const { result } = renderHook(() => useCreateDashboardForArea(input), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.existing).toBeNull();
  });

  it("finds the dashboard that already covers the area", async () => {
    vi.mocked(listDashboards).mockResolvedValue([
      dashboard({ id: "existing" }),
    ]);

    const { result } = renderHook(() => useCreateDashboardForArea(input), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.existing?.id).toBe("existing"));
  });

  it("creates the dashboard titled by its AOI, with no name of its own", async () => {
    const { result } = renderHook(() => useCreateDashboardForArea(input), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isResolving).toBe(false));

    await act(() => result.current.create());

    expect(createDashboard).toHaveBeenCalledWith({
      aois: [
        {
          source: "gadm",
          src_id: "BRA.16_1",
          subtype: "state-province",
          name: "Paraná, Brazil",
        },
      ],
    });
  });

  it("surfaces the card before the analysis resolves", async () => {
    let finishAnalysis: (r: { id: string; charts: [] }) => void = () => {};
    vi.mocked(analysisService.run).mockReturnValue(
      new Promise((resolve) => {
        finishAnalysis = resolve;
      })
    );

    const { result } = renderHook(() => useCreateDashboardForArea(input), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isResolving).toBe(false));

    // Deliberately not awaited: create() only settles once the analysis does,
    // and the whole point is that the card lands well before that.
    act(() => {
      void result.current.create();
    });

    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(cards()[0].dashboardId).toBe("new-dash");
    // The button is free again while the job is still running.
    expect(result.current.isCreating).toBe(false);
    expect(addInsightWidget).not.toHaveBeenCalled();

    await act(async () => {
      finishAnalysis({ id: "insight-1", charts: [] });
    });
    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("new-dash", "insight-1")
    );
  });

  it("attaches the analysis to the new dashboard", async () => {
    const { result } = renderHook(() => useCreateDashboardForArea(input), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isResolving).toBe(false));

    await act(() => result.current.create());

    expect(analysisService.run).toHaveBeenCalledWith({
      area: {
        name: "Paraná, Brazil",
        source: "gadm",
        srcId: "BRA.16_1",
        subtype: "state-province",
      },
      dataset: { id: 4, name: "Tree cover loss" },
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });
    expect(addInsightWidget).toHaveBeenCalledWith("new-dash", "insight-1");
  });

  it("skips the analysis when no dataset is active", async () => {
    const noDataset: CreateDashboardForAreaInput = {
      areaName: input.areaName,
      source: input.source,
      srcId: input.srcId,
      subtype: input.subtype,
    };
    const { result } = renderHook(() => useCreateDashboardForArea(noDataset), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isResolving).toBe(false));

    await act(() => result.current.create());

    expect(analysisService.run).not.toHaveBeenCalled();
    expect(addInsightWidget).not.toHaveBeenCalled();
    // The dashboard still exists and is still announced — an empty grid.
    expect(cards()).toHaveLength(1);
  });

  it("keeps the dashboard and its card when the analysis fails", async () => {
    vi.mocked(analysisService.run).mockRejectedValue(new Error("job failed"));

    const { result } = renderHook(() => useCreateDashboardForArea(input), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isResolving).toBe(false));

    await act(() => result.current.create());

    expect(cards()).toHaveLength(1);
    expect(addInsightWidget).not.toHaveBeenCalled();
    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning" })
    );
  });

  it("emits no card when the create itself fails", async () => {
    vi.mocked(createDashboard).mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() => useCreateDashboardForArea(input), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isResolving).toBe(false));

    await act(() => result.current.create());

    expect(cards()).toHaveLength(0);
    expect(analysisService.run).not.toHaveBeenCalled();
    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" })
    );
    expect(result.current.isCreating).toBe(false);
  });

  it("does nothing without an input", async () => {
    const { result } = renderHook(() => useCreateDashboardForArea(null), {
      wrapper: wrapper(),
    });

    await act(() => result.current.create());

    expect(createDashboard).not.toHaveBeenCalled();
    expect(result.current.existing).toBeUndefined();
  });
});
