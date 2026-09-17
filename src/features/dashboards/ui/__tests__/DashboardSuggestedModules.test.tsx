// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The chatStore import chain reaches the Chakra toaster (.tsx) — stub it so the
// test environment can parse the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Keep the dashboard detail off the network (the cache is seeded) and spy on
// the widget writes.
vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getDashboard: vi.fn(() => new Promise(() => {})),
  addTextWidget: vi.fn().mockResolvedValue(undefined),
  addInsightWidget: vi.fn().mockResolvedValue(undefined),
}));

import {
  addInsightWidget,
  addTextWidget,
  getDashboard,
} from "../../api/dashboards";
import { toaster } from "@/app/components/ui/toaster";
import {
  CURATED_SUGGESTED_MODULES,
  SUGGESTED_PROMPT_MODULES,
} from "../../lib/suggested-modules";
import { usePendingInsightWidgetsStore } from "../../model/pending-insight-widgets-store";
import { dashboardKeys } from "../dashboardQueries";
import DashboardSuggestedModules from "../DashboardSuggestedModules";
import type { Dashboard, DashboardWidget } from "../../api/schemas";
import {
  AnalysisJobFailedError,
  type AnalysisResult,
  type AnalysisService,
} from "@/src/features/analysis";
import type { Chart } from "@/src/entities/insight";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";
import useViewContextStore from "@/app/store/viewContextStore";

const sendSpy = vi.fn().mockResolvedValue({ isNew: false, id: "t1" });

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Pará forest watch",
  description: null,
  is_public: false,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  aois: [
    {
      id: "a1",
      position: 0,
      source: "gadm",
      src_id: "BRA.14_1",
      subtype: "state-province",
      name: "Pará",
    },
  ],
  sections: [],
  widgets: [],
};

const curatedTclWidget: DashboardWidget = {
  id: "w-tcl",
  position: 0,
  widget_type: "insight",
  insight_id: "ins-existing",
  config: {},
  created_at: "2026-07-01T00:00:00Z",
  insight: {
    id: "ins-existing",
    insight_text: "",
    codeact_parts: [],
    charts: [
      {
        id: "c-x",
        position: 0,
        title: "Annual tree cover loss",
        chart_type: "bar",
        x_axis: "year",
        y_axis: "loss_ha",
        series_fields: null,
        chart_data: [],
        dataset_id: 4,
      },
    ],
  },
};

const chart: Chart = {
  id: "c-1",
  position: 0,
  title: "Annual tree cover loss",
  type: "bar",
  xAxis: "year",
  yAxis: "loss_ha",
  colorField: "",
  stackField: "",
  groupField: "",
  seriesFields: [],
  data: [{ year: 2020, loss_ha: 5 }],
};

const RESULT: AnalysisResult = { id: "ins-1", charts: [chart] };
const TCL_LABEL = "Tree cover loss analysis";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeService(impl: AnalysisService["run"]): AnalysisService {
  return { run: vi.fn(impl) };
}

const idleService = () => fakeService(() => Promise.resolve(RESULT));

const renderModules = (
  isOwner: boolean,
  {
    seed = dashboard,
    service = idleService(),
  }: { seed?: Dashboard; service?: AnalysisService } = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail(seed.id), seed);
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardSuggestedModules
          dashboard={seed}
          isOwner={isOwner}
          service={service}
        />
      </ChakraProvider>
    </QueryClientProvider>
  );
};

const tile = (name: string) => screen.getByRole("button", { name });
const pendingEntries = () => usePendingInsightWidgetsStore.getState().entries;

describe("DashboardSuggestedModules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePendingInsightWidgetsStore.getState().reset();
    useChatStore.setState({ sendMessage: sendSpy, isLoading: false });
    useSidebarStore.setState({ chatInputFocusToken: 0 });
    useAuthStore.setState({ usedPrompts: 0, totalPrompts: 10, userId: "u1" });
    useViewContextStore
      .getState()
      .setViewContext({ page: "dashboard", dashboard_id: "d1" });
  });

  it("lists the curated tiles first, in suite order, then the prompt tiles, then the neutral cards", () => {
    renderModules(true);

    const names = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const expectedStart = [
      ...CURATED_SUGGESTED_MODULES.map((m) => m.label),
      ...SUGGESTED_PROMPT_MODULES.map((m) => m.label),
      "Text block",
      "Describe your own via the chat",
    ];
    expect(names).toHaveLength(expectedStart.length);
    expectedStart.forEach((label, i) => expect(names[i]).toContain(label));
    // Every curated tile carries the CURATED badge.
    expect(screen.getAllByText("CURATED")).toHaveLength(
      CURATED_SUGGESTED_MODULES.length
    );
  });

  it("sends each prompt card's canned prompt as a chat message", () => {
    renderModules(true);

    for (const card of SUGGESTED_PROMPT_MODULES) {
      fireEvent.click(tile(card.label));
    }

    expect(sendSpy).toHaveBeenCalledTimes(SUGGESTED_PROMPT_MODULES.length);
    for (const card of SUGGESTED_PROMPT_MODULES) {
      expect(sendSpy).toHaveBeenCalledWith(card.prompt);
    }
  });

  it("a curated tile runs the analysis for the dashboard's area, then adds it", async () => {
    const d = deferred<AnalysisResult>();
    const service = fakeService(() => d.promise);
    vi.mocked(getDashboard).mockResolvedValueOnce(dashboard);
    renderModules(true, { service });

    fireEvent.click(tile(TCL_LABEL));

    await waitFor(() => expect(pendingEntries()).toHaveLength(1));
    expect(pendingEntries()[0]).toMatchObject({
      key: "d1:4",
      title: "Tree cover loss in Pará",
      chartCountHint: 2,
    });
    expect(service.run).toHaveBeenCalledWith(
      expect.objectContaining({
        area: {
          name: "Pará",
          source: "gadm",
          srcId: "BRA.14_1",
          subtype: "state-province",
        },
        dataset: { id: 4, name: "Tree cover loss" },
      })
    );
    // Running: inert, captioned, no prompt sent.
    const running = tile(TCL_LABEL);
    expect(running.textContent).toContain("Running...");
    expect(running.getAttribute("aria-disabled")).toBe("true");
    expect(sendSpy).not.toHaveBeenCalled();

    d.resolve(RESULT);

    await waitFor(() =>
      expect(addInsightWidget).toHaveBeenCalledWith("d1", "ins-1", undefined)
    );
    await waitFor(() => expect(pendingEntries()).toEqual([]));
    expect(toaster.create).not.toHaveBeenCalled();
  });

  it("shows a curated analysis already on the dashboard as inert 'On dashboard'", () => {
    const service = idleService();
    renderModules(true, {
      seed: { ...dashboard, widgets: [curatedTclWidget] },
      service,
    });

    const onDashboard = tile(TCL_LABEL);
    expect(onDashboard.textContent).toContain("On dashboard");
    expect(onDashboard.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(onDashboard);
    expect(service.run).not.toHaveBeenCalled();
    // The other curated tiles are unaffected.
    expect(screen.getAllByText("CURATED")).toHaveLength(
      CURATED_SUGGESTED_MODULES.length - 1
    );
  });

  it("toasts the card copy when the curated job fails, and frees the tile", async () => {
    const service = fakeService(() =>
      Promise.reject(new AnalysisJobFailedError("job-1"))
    );
    renderModules(true, { service });

    fireEvent.click(tile(TCL_LABEL));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Not available for this area right now",
          type: "warning",
        })
      )
    );
    expect(addInsightWidget).not.toHaveBeenCalled();
    await waitFor(() => expect(pendingEntries()).toEqual([]));
    expect(tile(TCL_LABEL).getAttribute("aria-disabled")).not.toBe("true");
  });

  it("runs a curated tile even while a chat turn streams (no chat round-trip)", async () => {
    useChatStore.setState({ isLoading: true });
    const service = idleService();
    renderModules(true, { service });

    fireEvent.click(tile(TCL_LABEL));

    await waitFor(() => expect(service.run).toHaveBeenCalledTimes(1));
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("renders curated tiles inert when the dashboard has no area", () => {
    const service = idleService();
    renderModules(true, { seed: { ...dashboard, aois: [] }, service });

    const tcl = tile(TCL_LABEL);
    expect(tcl.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(tcl);
    expect(service.run).not.toHaveBeenCalled();
  });

  it("adds a blank text widget on 'Text block' for the owner", async () => {
    renderModules(true);

    fireEvent.click(tile("Text block"));

    await waitFor(() => expect(addTextWidget).toHaveBeenCalledWith("d1"));
  });

  it("surfaces an error toast when adding the text widget fails", async () => {
    vi.mocked(addTextWidget).mockRejectedValueOnce(
      new Error("config.text: field required")
    );
    // The mutation's per-call onError fires after its onSettled refetch has
    // landed, and the curated tiles keep a detail observer alive, so let the
    // (otherwise hanging) refetch resolve.
    vi.mocked(getDashboard).mockResolvedValueOnce(dashboard);
    renderModules(true);

    fireEvent.click(tile("Text block"));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't add text block",
          description: "config.text: field required",
          type: "error",
        })
      )
    );
  });

  it("renders nothing for a viewer who doesn't own the dashboard", () => {
    useAuthStore.setState({ userId: "visitor" });
    renderModules(false);

    // Every card writes to the dashboard, so a viewer gets no row at all.
    expect(screen.queryByText("Suggested modules")).toBeNull();
    expect(screen.queryByRole("button", { name: "Text block" })).toBeNull();
    for (const card of [
      ...CURATED_SUGGESTED_MODULES,
      ...SUGGESTED_PROMPT_MODULES,
    ]) {
      expect(screen.queryByRole("button", { name: card.label })).toBeNull();
    }
  });

  it("won't send a prompt while a chat turn is still streaming", () => {
    useChatStore.setState({ isLoading: true });
    renderModules(true);

    for (const card of SUGGESTED_PROMPT_MODULES) {
      fireEvent.click(tile(card.label));
    }
    fireEvent.click(tile("Describe your own via the chat"));

    // A concurrent send clears the in-flight turn's tool steps and overwrites
    // its abort controller, orphaning the running request.
    expect(sendSpy).not.toHaveBeenCalled();
    expect(useSidebarStore.getState().chatInputFocusToken).toBe(0);
    expect(
      tile(SUGGESTED_PROMPT_MODULES[0].label).getAttribute("aria-disabled")
    ).toBe("true");
  });

  it("won't send a prompt once the prompt quota is spent", () => {
    useAuthStore.setState({ usedPrompts: 10, totalPrompts: 10 });
    renderModules(true);

    fireEvent.click(tile(SUGGESTED_PROMPT_MODULES[0].label));
    fireEvent.click(tile("Describe your own via the chat"));

    expect(sendSpy).not.toHaveBeenCalled();
    expect(useSidebarStore.getState().chatInputFocusToken).toBe(0);
  });

  it("still allows adding a text block while a chat turn streams", () => {
    // The note is a direct POST, not a chat round-trip, so the chat gates
    // don't apply to it.
    useChatStore.setState({ isLoading: true });
    renderModules(true);

    fireEvent.click(tile("Text block"));

    return waitFor(() => expect(addTextWidget).toHaveBeenCalledWith("d1"));
  });

  it("requests chat input focus on 'Describe your own via the chat'", () => {
    renderModules(true);

    fireEvent.click(tile("Describe your own via the chat"));

    expect(useSidebarStore.getState().chatInputFocusToken).toBe(1);
  });
});
