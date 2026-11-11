import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/src/features/analysis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/features/analysis")>()),
  cancelRunningAnalyses: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import { cancelRunningAnalyses } from "@/src/features/analysis";
import {
  agentTextLine,
  ndjsonResponse,
} from "@/app/store/__tests__/stream-fixtures";
import useChatStore from "@/app/store/chatStore";
import useInsightStore from "@/app/store/insightStore";
import type { Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { ChatMessage, InsightWidget } from "@/app/types/chat";
import { useSelectionStore } from "@/src/features/analysis";

import {
  answerFailedSince,
  answeredCount,
  chatMessageCount,
  chatSettledSince,
  checklistEvidence,
  clearAreasAndCharts,
  clearDatasetLayers,
  clearMap,
  handRunChartFailed,
  leadChartShowsWorking,
  openAreasPanel,
  openDataCatalog,
  sentMessageSince,
} from "../app-actions";

const msg = (type: ChatMessage["type"], extra: Partial<ChatMessage> = {}) =>
  ({
    id: Math.random().toString(36),
    type,
    message: "",
    timestamp: new Date().toISOString(),
    ...extra,
  }) as ChatMessage;

const setChat = (messages: ChatMessage[], isLoading = false) =>
  useChatStore.setState({ messages, isLoading });

beforeEach(() => setChat([]));

describe("chat progress predicates", () => {
  it("ignores messages from before the baseline", () => {
    setChat([msg("user"), msg("area-card")]);
    const baseline = chatMessageCount();
    expect(sentMessageSince(baseline)).toBe(false);
    expect(sentMessageSince(0)).toBe(true);
  });

  it("is not settled while the answer streams", () => {
    setChat([msg("assistant")]);
    const baseline = chatMessageCount();
    setChat([msg("assistant"), msg("user"), msg("area-card")], true);
    expect(sentMessageSince(baseline)).toBe(true);
    expect(chatSettledSince(baseline)).toBe(false);
  });

  it("is settled once streaming stops after a sent message", () => {
    setChat([msg("user"), msg("assistant")], false);
    expect(chatSettledSince(0)).toBe(true);
    setChat([msg("assistant")], false);
    expect(chatSettledSince(0)).toBe(false);
  });

  it("sees the next question when a message before the baseline goes", () => {
    setChat([msg("assistant"), msg("analyse-nudge")]);
    const baseline = chatMessageCount();
    setChat([msg("assistant"), msg("user")]);
    expect(sentMessageSince(baseline)).toBe(true);
  });

  it("sees the next question when sending it drops a profile ask", async () => {
    useChatStore.getState().reset();
    useChatStore.getState().addMessage({ type: "assistant", message: "A" });
    useChatStore.getState().upsertProfileAsk("profile-prompt");
    const baseline = chatMessageCount();
    vi.mocked(apiFetch).mockResolvedValue(ndjsonResponse([agentTextLine("B")]));

    await useChatStore.getState().sendMessage("Tree cover loss in Kenya");

    const { messages } = useChatStore.getState();
    // The shift: the ask is gone, so the question took its index.
    expect(messages.some((m) => m.transient)).toBe(false);
    expect(sentMessageSince(baseline)).toBe(true);
    expect(chatSettledSince(baseline)).toBe(true);
  });
});

describe("answerFailedSince", () => {
  beforeEach(() => useChatStore.setState({ completedAnswers: 2 }));

  it("is false until a question was sent and has finished", () => {
    const answers = answeredCount();
    expect(answerFailedSince(0, answers)).toBe(false);
    setChat([msg("user")], true);
    expect(answerFailedSince(0, answers)).toBe(false);
  });

  it("is true when the question finished without an answer", () => {
    const answers = answeredCount();
    setChat([msg("user"), msg("error")], false);
    expect(answerFailedSince(0, answers)).toBe(true);
  });

  it("is false when the chat store counted the answer", () => {
    const answers = answeredCount();
    setChat([msg("user"), msg("assistant")], false);
    useChatStore.setState({ completedAnswers: answers + 1 });
    expect(answerFailedSince(0, answers)).toBe(false);
  });
});

describe("setting the stage", () => {
  beforeEach(() => {
    useSidebarStore.setState({
      areasPanelOpen: false,
      areasPanelFilter: "mine",
      catalogCategory: "wildfires",
    });
  });

  it("stops a chart still loading, so it can't land on the cleared map", () => {
    vi.mocked(cancelRunningAnalyses).mockClear();
    clearMap();
    expect(cancelRunningAnalyses).toHaveBeenCalledTimes(1);
  });

  it("clears the map back to the All catalogue category, so every tour row shows", () => {
    clearMap();
    expect(useSidebarStore.getState().catalogCategory).toBe("all");
  });

  it("opens the Data Catalog on All, whatever category was last picked", () => {
    openDataCatalog();
    const { dataCatalogOpen, catalogCategory } = useSidebarStore.getState();
    expect(dataCatalogOpen).toBe(true);
    expect(catalogCategory).toBe("all");
  });

  it("clears the map back to the Boundaries tab, where the tour's cards are", () => {
    clearMap();
    expect(useSidebarStore.getState().areasPanelFilter).toBe("boundaries");
  });

  it("opens the Areas panel on Boundaries, whatever tab was last used", () => {
    openAreasPanel();
    const { areasPanelOpen, areasPanelFilter } = useSidebarStore.getState();
    expect(areasPanelOpen).toBe(true);
    expect(areasPanelFilter).toBe("boundaries");
  });
});

const layer = (over: Partial<Layer> & Pick<Layer, "id">): Layer => ({
  name: over.id,
  type: "geojson",
  visible: true,
  ...over,
});
const aoi = (source: string, src_id: string, name = src_id) => ({
  name,
  source,
  src_id,
  subtype: "x",
});
const widget = (over: Partial<InsightWidget> = {}): InsightWidget => ({
  id: Math.random().toString(36),
  type: "bar",
  title: "t",
  description: "",
  data: [],
  xAxis: "x",
  yAxis: "y",
  ...over,
});
const TCL_LAYER = layer({ id: "tcl", type: "raster", datasetId: 4 });
const KENYA = layer({
  id: "Kenya",
  featureRefs: [{ name: "Kenya", source: "gadm", srcId: "KEN" }],
  aoiSelection: { name: "Kenya", aois: [aoi("gadm", "KEN", "Kenya")] },
});

describe("the chat question's stage", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useInsightStore.getState().clearInsights();
  });

  it("takes the area and charts off but keeps the dataset", () => {
    vi.mocked(cancelRunningAnalyses).mockClear();
    useMapStore.setState({ layers: [TCL_LAYER, KENYA] });
    useInsightStore.setState({ insights: [widget()] });
    useSelectionStore.getState().select({
      name: "Kenya",
      source: "gadm",
      srcId: "KEN",
    });

    clearAreasAndCharts();

    expect(useMapStore.getState().layers.map((l) => l.id)).toEqual(["tcl"]);
    expect(useInsightStore.getState().insights).toEqual([]);
    // Or the View analysis nudge would offer Kenya again.
    expect(useSelectionStore.getState().selection).toBeNull();
    expect(cancelRunningAnalyses).toHaveBeenCalledTimes(1);
  });

  it("takes every dataset off for the imagery task, leaving the areas", () => {
    useMapStore.setState({ layers: [TCL_LAYER, KENYA] });
    clearDatasetLayers();
    expect(useMapStore.getState().layers.map((l) => l.id)).toEqual(["Kenya"]);
  });
});

describe("chart predicates", () => {
  beforeEach(() => {
    useInsightStore.getState().clearInsights();
    useChatStore.setState({ isGeneratingInsight: false, messages: [] });
  });

  const acceptedNudge = () =>
    msg("view-analysis-nudge", {
      viewAnalysisSuggestion: {
        area: { name: "Kenya", source: "gadm", srcId: "KEN" },
        datasetId: 4,
        datasetName: "Tree cover loss",
        startDate: "2001-01-01",
        endDate: "2025-12-31",
        accepted: true,
      },
    });

  it("sees a hand-run chart fail only once nothing is loading", () => {
    useChatStore.setState({
      messages: [acceptedNudge()],
      isGeneratingInsight: true,
    });
    expect(handRunChartFailed()).toBe(false);
    useChatStore.setState({ isGeneratingInsight: false });
    expect(handRunChartFailed()).toBe(true);
    useInsightStore.setState({ insights: [widget()] });
    expect(handRunChartFailed()).toBe(false);
  });

  it("offers Show working only on a chart made with the AI's code", () => {
    expect(leadChartShowsWorking()).toBe(false);
    useInsightStore.setState({ insights: [widget({ curated: true })] });
    expect(leadChartShowsWorking()).toBe(false);
    useInsightStore.setState({
      insights: [
        widget({ curated: true }),
        widget({
          curated: false,
          generation: { codeact_parts: [{ type: "code_block", content: "" }] },
        }),
      ],
    });
    expect(leadChartShowsWorking()).toBe(true);
  });
});

describe("checklistEvidence", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useInsightStore.getState().clearInsights();
  });

  const evidence = () => checklistEvidence();
  const setLayers = (...layers: Layer[]) => useMapStore.setState({ layers });

  it("finds nothing on an empty map, nor for one ordinary area", () => {
    expect(Object.values(evidence()).flat()).toEqual([]);
    setLayers(TCL_LAYER, KENYA);
    expect(Object.values(evidence()).flat()).toEqual([]);
  });

  it("sees an Integrated alerts chart, from either route", () => {
    useInsightStore.setState({
      insights: [
        widget({ insightId: "a", datasetName: "Integrated alerts" }),
        widget({
          insightId: "b",
          analysisParams: { dataset: "Integrated alerts" },
        }),
        widget({ insightId: "c", datasetName: "Tree cover loss" }),
      ],
    });
    expect(evidence().alerts).toEqual(["a", "b"]);
  });

  it("sees a protected area or concession, however it was picked", () => {
    setLayers(
      // A boundary click names the source by the layer id.
      layer({ id: "Serengeti", featureRefs: [{ name: "S", source: "WDPA" }] }),
      // Search and the assistant use the lowercase backend key.
      layer({
        id: "Palm",
        aoiSelection: { name: "Palm", aois: [aoi("oil_palm", "p1")] },
      }),
      KENYA
    );
    expect(evidence()["protected-area"]).toEqual(["Serengeti", "Palm"]);
  });

  it("ignores a hidden area", () => {
    setLayers(
      layer({
        id: "Serengeti",
        visible: false,
        featureRefs: [{ name: "S", source: "wdpa" }],
      })
    );
    expect(evidence()["protected-area"]).toEqual([]);
  });

  it("sees a drawn or uploaded area", () => {
    setLayers(
      KENYA,
      layer({ id: "area-1", featureRefs: [{ name: "Mine", source: "custom" }] })
    );
    expect(evidence()["own-area"]).toEqual(["area-1"]);
  });

  // As pick_aoi adds them: `selectionName` marks the assistant's picks.
  const picked = (id: string, ...aois: ReturnType<typeof aoi>[]) =>
    layer({ id, selectionName: id, aoiSelection: { name: id, aois } });

  it("sees two places the assistant picked, in one selection or in two", () => {
    setLayers(
      picked("Kenya and Tanzania", aoi("gadm", "KEN"), aoi("gadm", "TZA"))
    );
    expect(evidence().compare).toEqual(["gadm:KEN|gadm:TZA"]);
    setLayers(
      picked("Kenya", aoi("gadm", "KEN")),
      picked("Tanzania", aoi("gadm", "TZA"))
    );
    expect(evidence().compare).toEqual(["gadm:KEN|gadm:TZA"]);
  });

  it("doesn't see a comparison in a drawn area kept beside a searched place", () => {
    setLayers(
      KENYA,
      layer({ id: "area-1", featureRefs: [{ name: "Mine", source: "custom" }] })
    );
    expect(evidence().compare).toEqual([]);
  });

  it("counts one place twice as one place", () => {
    setLayers(
      picked("Kenya", aoi("gadm", "KEN")),
      picked("Kenya again", aoi("gadm", "KEN"))
    );
    expect(evidence().compare).toEqual([]);
  });

  it("sees satellite imagery on the map", () => {
    setLayers(
      TCL_LAYER,
      layer({
        id: "imagery-1",
        type: "raster",
        imagery: { tile_url: "x", mosaic_id: "m1", aoi_names: ["Mau"] },
      })
    );
    expect(evidence()["satellite-imagery"]).toEqual(["imagery-1"]);
  });
});
