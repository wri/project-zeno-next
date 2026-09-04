// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Chart and map bodies are their components' contracts — stub them so this
// test asserts the grid's structure only.
vi.mock("@/app/components/WidgetMessage", () => ({
  default: ({ widget }: { widget: { title: string } }) => (
    <div data-testid="widget-message">{widget.title}</div>
  ),
}));
vi.mock("../DashboardMapWidget", () => ({
  default: () => <div data-testid="map-widget" />,
}));

import DashboardWidgetsGrid from "../DashboardWidgetsGrid";
import type {
  Dashboard,
  DashboardSection,
  DashboardWidget,
} from "../../api/schemas";
import { usePendingInsightWidgetsStore } from "../../model/pending-insight-widgets-store";
import useAuthStore from "@/app/store/authStore";

const note = (
  id: string,
  text: string,
  position: number,
  sectionId: string | null = null
): DashboardWidget => ({
  id,
  position,
  widget_type: "text",
  insight_id: null,
  section_id: sectionId,
  config: { text },
  created_at: "2026-09-01T00:00:00Z",
  insight: null,
});

const curatedInsight = (
  id: string,
  insightId: string,
  datasetId: number,
  position: number
): DashboardWidget => ({
  id,
  position,
  widget_type: "insight",
  insight_id: insightId,
  section_id: null,
  config: {},
  created_at: "2026-09-01T00:00:00Z",
  insight: {
    id: insightId,
    insight_text: "",
    codeact_parts: [],
    charts: [
      {
        id: `${id}-c1`,
        position: 0,
        title: "Tree cover gain",
        chart_type: "bar",
        x_axis: "period",
        y_axis: "gain_ha",
        series_fields: null,
        chart_data: [],
        dataset_id: datasetId,
      },
    ],
  },
});

const section = (
  id: string,
  title: string,
  position: number
): DashboardSection => ({
  id,
  title,
  description: null,
  position,
  created_at: "2026-09-01T00:00:00Z",
});

const dashboard = (
  sections: DashboardSection[],
  widgets: DashboardWidget[]
): Dashboard => ({
  id: "d1",
  user_id: "u1",
  name: "Pará forest watch",
  description: null,
  is_public: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  aois: [
    {
      source: "gadm",
      src_id: "BRA.14_1",
      subtype: "state-province",
      name: "Pará",
      id: "a1",
      position: 0,
    },
  ],
  sections,
  widgets,
});

const pendingTcl = {
  dashboardId: "d1",
  datasetId: 4,
  title: "Tree cover loss in Pará",
  datasetName: "Tree cover loss",
  chartCountHint: 2,
};

const renderGrid = (d: Dashboard) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ChakraProvider value={defaultSystem}>
        <DashboardWidgetsGrid dashboard={d} />
      </ChakraProvider>
    </QueryClientProvider>
  );

const store = () => usePendingInsightWidgetsStore.getState();

/** True when `a` comes before `b` in document order. */
const precedes = (a: Element, b: Element) =>
  !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("DashboardWidgetsGrid pending analyses", () => {
  beforeEach(() => {
    store().reset();
    useAuthStore.setState({ userId: "u1" });
  });

  it("renders a pending analysis as a loading card after the ungrouped widgets and above the first section", () => {
    store().begin(pendingTcl);
    renderGrid(
      dashboard(
        [section("s1", "Deforestation", 0)],
        [note("t1", "Top note", 0), note("w1", "Grouped", 0, "s1")]
      )
    );

    const card = screen.getByTestId("pending-insight-card");
    expect(card.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Tree cover loss in Pará")).toBeTruthy();
    expect(screen.getByText("RUNNING ANALYSIS")).toBeTruthy();
    expect(screen.getAllByTestId("chart-card-skeleton")).toHaveLength(1);
    // Two expected charts show as a pager-shaped footer.
    expect(screen.getByText("1 of 2 charts")).toBeTruthy();

    const topNote = screen.getByText("Top note");
    const heading = screen.getByRole("heading", { name: "Deforestation" });
    expect(precedes(topNote, card)).toBe(true);
    expect(precedes(card, heading)).toBe(true);
  });

  it("keeps the ungrouped panel on screen for a pending analysis when every widget is sectioned", () => {
    store().begin(pendingTcl);
    renderGrid(
      dashboard(
        [section("s1", "Deforestation", 0)],
        [note("w1", "Grouped", 0, "s1")]
      )
    );

    const card = screen.getByTestId("pending-insight-card");
    const heading = screen.getByRole("heading", { name: "Deforestation" });
    expect(precedes(card, heading)).toBe(true);
    // The pending card fills the top-level panel; no empty-section copy.
    expect(screen.queryByText("Nothing in this section yet.")).toBeNull();
  });

  it("stays out of the drag machinery: no widget or drag-item identity, no drop slot", () => {
    store().begin(pendingTcl);
    renderGrid(dashboard([], [note("t1", "Top note", 0)]));

    const card = screen.getByTestId("pending-insight-card");
    const item = card.closest("[data-widget-id], [data-drag-item]");
    expect(item).toBeNull();
    expect(screen.queryAllByTestId("widget-drop-slot")).toHaveLength(0);
  });

  it("omits the pager footer for a single expected chart", () => {
    store().begin({ ...pendingTcl, datasetId: 7, chartCountHint: 1 });
    renderGrid(dashboard([], [note("t1", "Top note", 0)]));

    expect(screen.getByTestId("pending-insight-card")).toBeTruthy();
    expect(screen.queryByText(/of 1 charts/)).toBeNull();
  });

  it("renders pending analyses in the order they began", () => {
    store().begin(pendingTcl);
    store().begin({
      ...pendingTcl,
      datasetId: 11,
      title: "Integrated alerts in Pará",
      chartCountHint: 1,
    });
    renderGrid(dashboard([], [note("t1", "Top note", 0)]));

    const cards = screen.getAllByTestId("pending-insight-card");
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Running Tree cover loss in Pará",
      "Running Integrated alerts in Pará",
    ]);
  });

  it("hides a pending entry once the real widget carries its insight id", () => {
    const key = store().begin(pendingTcl);
    store().attachInsightId(key, "ins-1");
    renderGrid(dashboard([], [curatedInsight("w-ins", "ins-1", 4, 0)]));

    expect(screen.queryByTestId("pending-insight-card")).toBeNull();
    expect(screen.getByTestId("widget-message")).toBeTruthy();
  });

  it("hides a pending entry once a curated widget for its dataset is on the dashboard", () => {
    store().begin({ ...pendingTcl, datasetId: 5, chartCountHint: 1 });
    renderGrid(dashboard([], [curatedInsight("w-gain", "ins-gain", 5, 0)]));

    expect(screen.queryByTestId("pending-insight-card")).toBeNull();
  });

  it("ignores entries for other dashboards and stale entries", () => {
    store().begin({ ...pendingTcl, dashboardId: "d2" });
    store().begin({
      ...pendingTcl,
      datasetId: 8,
      startedAt: Date.now() - 600_000,
    });
    renderGrid(dashboard([], [note("t1", "Top note", 0)]));

    expect(screen.queryByTestId("pending-insight-card")).toBeNull();
  });
});
