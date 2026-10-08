// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listAnalysisTemplates: vi.fn(),
  applyAnalysisTemplate: vi.fn(),
}));

import { toaster } from "@/app/components/ui/toaster";
import {
  applyAnalysisTemplate,
  listAnalysisTemplates,
} from "../../api/dashboards";
import type {
  AnalysisTemplate,
  Dashboard,
  SectionFromTemplateResponse,
} from "../../api/schemas";
import DashboardAnalysisTemplates from "../DashboardAnalysisTemplates";
import { dashboardKeys } from "../dashboardQueries";

const dashboard: Dashboard = {
  id: "d1",
  user_id: "u1",
  name: "Paraná",
  description: null,
  is_public: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  aois: [
    {
      id: "a1",
      position: 0,
      source: "gadm",
      src_id: "BRA.18_1",
      subtype: "state-province",
      name: "Paraná",
    },
  ],
  sections: [],
  widgets: [],
};

const NRT: AnalysisTemplate = {
  name: "nrt-monitoring",
  label: "Near-real-time monitoring",
  args_schema: {},
  widgets: ["chart", "layer", "imagery"],
};

const built: SectionFromTemplateResponse = {
  section_id: "s-nrt",
  widget_ids: ["w1"],
  warnings: [],
  dashboard: {
    ...dashboard,
    sections: [
      {
        id: "s-nrt",
        title: "Recent disturbance alerts in Paraná",
        description: null,
        position: 0,
        template: {
          name: "nrt-monitoring",
          args: { days: 14 },
          start_date: "2026-09-16",
          end_date: "2026-09-30",
          built_at: "2026-09-30T10:00:00Z",
        },
        created_at: "2026-09-30T10:00:00Z",
      },
    ],
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const renderTemplates = ({ seed = dashboard }: { seed?: Dashboard } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.detail(seed.id), seed);
  render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardAnalysisTemplates dashboard={seed} />
      </ChakraProvider>
    </QueryClientProvider>
  );
  return queryClient;
};

const nrtCard = () =>
  screen.findByRole("button", { name: "Near real-time monitoring" });

describe("DashboardAnalysisTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAnalysisTemplates).mockResolvedValue([NRT]);
  });

  it("offers the near-real-time monitoring template with the design's label", async () => {
    renderTemplates();

    expect(screen.getByText("Add an analysis template")).toBeTruthy();
    const card = await nrtCard();
    // The design's copy, not the registry's "Near-real-time monitoring".
    expect(card.textContent).toContain("Near real-time monitoring");
    expect(card.textContent).toContain("Analysis template");
    expect(card.getAttribute("aria-disabled")).toBe("false");
  });

  it("wraps the label only between words, keeping real-time whole", async () => {
    renderTemplates();

    const words = Array.from((await nrtCard()).querySelectorAll("span")).map(
      (span) => span.textContent
    );
    expect(words).toEqual(expect.arrayContaining(["Near", "real-time"]));
  });

  it("shows the card while the registry loads", () => {
    vi.mocked(listAnalysisTemplates).mockReturnValue(new Promise(() => {}));
    renderTemplates();

    expect(
      screen.getByRole("button", { name: "Near real-time monitoring" })
    ).toBeTruthy();
  });

  it("offers the post-2020 forest loss template once the registry lists it", async () => {
    vi.mocked(listAnalysisTemplates).mockResolvedValue([
      NRT,
      {
        name: "post-2020-forest-loss",
        label: "Post-2020 forest loss",
        args_schema: {},
        widgets: ["natural_forest_loss", "layer", "imagery"],
      },
    ]);
    vi.mocked(applyAnalysisTemplate).mockResolvedValue(built);
    renderTemplates();

    const card = await screen.findByRole("button", {
      name: "Post-2020 forest loss",
    });
    // "Post-2020" is one word to the wrapper, never broken at its hyphen.
    expect(
      Array.from(card.querySelectorAll("span")).map((s) => s.textContent)
    ).toEqual(expect.arrayContaining(["Post-2020", "forest", "loss"]));
    expect(card.querySelector("img")?.getAttribute("src")).toBe(
      "/analysis_template_post_2020_forest_loss.jpg"
    );

    fireEvent.click(card);
    await waitFor(() =>
      expect(applyAnalysisTemplate).toHaveBeenCalledWith(
        "d1",
        "post-2020-forest-loss"
      )
    );
  });

  it("drops a card the registry does not list", async () => {
    vi.mocked(listAnalysisTemplates).mockResolvedValue([]);
    renderTemplates();

    await waitFor(() =>
      expect(screen.queryByText("Add an analysis template")).toBeNull()
    );
  });

  it("applies the template with its defaults and puts the built dashboard in the cache", async () => {
    vi.mocked(applyAnalysisTemplate).mockResolvedValue(built);
    const queryClient = renderTemplates();

    fireEvent.click(await nrtCard());

    await waitFor(() =>
      expect(
        queryClient.getQueryData<Dashboard>(dashboardKeys.detail("d1"))
          ?.sections
      ).toHaveLength(1)
    );
    expect(applyAnalysisTemplate).toHaveBeenCalledWith("d1", "nrt-monitoring");
    expect(toaster.create).not.toHaveBeenCalled();
  });

  it("reads as building and ignores clicks until the request returns", async () => {
    const request = deferred<SectionFromTemplateResponse>();
    vi.mocked(applyAnalysisTemplate).mockReturnValue(request.promise);
    renderTemplates();

    fireEvent.click(await nrtCard());
    await screen.findByText("Building...");
    const card = await nrtCard();
    expect(card.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(card);
    expect(applyAnalysisTemplate).toHaveBeenCalledTimes(1);

    request.resolve(built);
    await waitFor(() => expect(screen.queryByText("Building...")).toBeNull());
  });

  it("toasts each warning for a widget the backend left out", async () => {
    vi.mocked(applyAnalysisTemplate).mockResolvedValue({
      ...built,
      warnings: ["No cloud-free Sentinel-2 imagery in the period."],
    });
    renderTemplates();

    fireEvent.click(await nrtCard());

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "No cloud-free Sentinel-2 imagery in the period.",
          type: "warning",
        })
      )
    );
  });

  it("toasts the cause when a required widget failed", async () => {
    vi.mocked(applyAnalysisTemplate).mockRejectedValue(
      Object.assign(new Error("analytics pull failed"), { status: 502 })
    );
    renderTemplates();

    fireEvent.click(await nrtCard());

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't get the data for this template",
          type: "error",
        })
      )
    );
    expect((await nrtCard()).getAttribute("aria-disabled")).toBe("false");
  });

  it("keeps the cards inert on a dashboard with no area", async () => {
    renderTemplates({ seed: { ...dashboard, aois: [] } });

    const card = await nrtCard();
    expect(card.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(card);
    expect(applyAnalysisTemplate).not.toHaveBeenCalled();
  });
});
