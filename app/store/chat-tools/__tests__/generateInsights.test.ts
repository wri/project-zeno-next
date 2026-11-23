import { describe, it, expect, beforeEach, vi } from "vitest";

// What is on screen is not what was analyzed. These stores hold an area, a
// dataset and a date range that the chips must never pick up (they used to);
// mocked also because their import chains reach the Chakra toaster (.tsx).
vi.mock("@/app/store/mapStore", () => ({
  default: {
    getState: () => ({
      layers: [
        {
          id: "a",
          visible: true,
          name: "Map area",
          aoiSelection: { name: "Map area", aois: [] },
        },
        {
          id: "d",
          visible: true,
          name: "Map dataset",
          datasetId: 4,
          parameters: { canopy_cover: 75 },
        },
      ],
    }),
  },
}));

vi.mock("@/app/store/chatStore", () => ({
  default: {
    getState: () => ({
      dateRange: { start: new Date("2010-01-01"), end: new Date("2011-12-31") },
    }),
  },
}));

import { generateInsightsTool } from "../generateInsights";
import useInsightStore from "../../insightStore";
import { StreamMessage, ChatMessage } from "@/app/types/chat";

const baseMessage = (
  overrides: Partial<StreamMessage> = {}
): StreamMessage => ({
  type: "tool",
  name: "generate_insights",
  timestamp: new Date().toISOString(),
  ...overrides,
});

const chartData = (title = "Forest Loss") => ({
  id: "1",
  title,
  type: "bar" as const,
  insight: "some description",
  data: [{ year: 2020, area: 100 }],
  xAxis: "year",
  yAxis: "area",
});

type AddMessageFn = (message: Omit<ChatMessage, "id">) => void;

describe("generateInsightsTool", () => {
  let addMessage: ReturnType<typeof vi.fn<AddMessageFn>>;

  beforeEach(() => {
    useInsightStore.getState().clearInsights();
    addMessage = vi.fn<AddMessageFn>();
  });

  it("stores widgets in insightStore when charts_data is present", () => {
    generateInsightsTool(
      baseMessage({ charts_data: [chartData()] }),
      addMessage
    );
    const { insights } = useInsightStore.getState();
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Forest Loss");
  });

  it("does not call addMessage in the happy path", () => {
    generateInsightsTool(
      baseMessage({ charts_data: [chartData()] }),
      addMessage
    );
    expect(addMessage).not.toHaveBeenCalled();
  });

  it("sets pendingBatch to the newly added widgets", () => {
    generateInsightsTool(
      baseMessage({
        charts_data: [chartData("Tree Cover"), chartData("Fires")],
      }),
      addMessage
    );
    const { pendingBatch } = useInsightStore.getState();
    expect(pendingBatch).toHaveLength(2);
    expect(pendingBatch[0].title).toBe("Tree Cover");
  });

  it("attaches the streamed insight_id to every chart's widget", () => {
    generateInsightsTool(
      baseMessage({
        charts_data: [chartData("Tree Cover"), chartData("Fires")],
        insight_id: "ins-1",
      }),
      addMessage
    );
    const { insights } = useInsightStore.getState();
    expect(insights.map((w) => w.insightId)).toEqual(["ins-1", "ins-1"]);
    expect(insights.map((w) => w.chartPosition)).toEqual([0, 1]);
  });

  it("leaves insightId unset when the stream carries no insight_id", () => {
    generateInsightsTool(
      baseMessage({ charts_data: [chartData()] }),
      addMessage
    );
    expect(useInsightStore.getState().insights[0].insightId).toBeUndefined();
  });

  const recordedPull = {
    areas: [{ name: "Rondônia, Brazil", source: "gadm", src_id: "BRA.22" }],
    dataset_id: 4,
    dataset_name: "Tree cover loss",
    start_date: "2001-01-01",
    end_date: "2024-12-31",
    canopy_cover: 30,
    context_layer: null,
  };

  it("takes the inputs from the streamed analysis_inputs", () => {
    generateInsightsTool(
      baseMessage({
        charts_data: [chartData(), chartData("By driver")],
        insight_id: "ins-1",
        analysis_inputs: [recordedPull],
      }),
      addMessage
    );
    const { insights } = useInsightStore.getState();
    for (const widget of insights) {
      expect(widget.analysisInputs).toEqual({
        recorded: true,
        areas: [
          {
            name: "Rondônia, Brazil",
            ref: { source: "gadm", srcId: "BRA.22" },
          },
        ],
        datasets: [{ name: "Tree cover loss", id: 4 }],
        canopyCover: [30],
        years: [{ start: 2001, end: 2024 }],
      });
      expect(widget.datasetName).toBe("Tree cover loss");
    }
  });

  it("says not recorded when the stream has no inputs, whatever the map shows", () => {
    generateInsightsTool(
      baseMessage({
        charts_data: [chartData()],
        // A stream dataset is the agent's pick, not a record of the analysis.
        dataset: {
          dataset_id: 4,
          dataset_name: "Tree cover loss",
          threshold: 30,
        },
      }),
      addMessage
    );
    const [widget] = useInsightStore.getState().insights;
    expect(widget.analysisInputs).toEqual({ recorded: false });
    expect(widget.datasetName).toBeUndefined();
  });

  it("names no dataset when the analysis pulled several", () => {
    generateInsightsTool(
      baseMessage({
        charts_data: [chartData()],
        analysis_inputs: [
          recordedPull,
          { ...recordedPull, dataset_id: 9, dataset_name: "Tree cover gain" },
        ],
      }),
      addMessage
    );
    expect(useInsightStore.getState().insights[0].datasetName).toBeUndefined();
  });

  it("does nothing when charts_data is absent", () => {
    generateInsightsTool(baseMessage(), addMessage);
    expect(useInsightStore.getState().insights).toHaveLength(0);
    expect(addMessage).not.toHaveBeenCalled();
  });

  it("passes seriesFields through to insight widgets", () => {
    generateInsightsTool(
      baseMessage({
        charts_data: [
          {
            ...chartData("Emissions"),
            yAxis: "",
            seriesFields: ["indonesia_emissions_co2", "malaysia_emissions_co2"],
          },
        ],
      }),
      addMessage
    );
    const { insights } = useInsightStore.getState();
    expect(insights[0].seriesFields).toEqual([
      "indonesia_emissions_co2",
      "malaysia_emissions_co2",
    ]);
  });

  it("marks widgets as curated when codeact_parts is empty", () => {
    generateInsightsTool(
      baseMessage({ charts_data: [chartData()], codeact_parts: [] }),
      addMessage
    );
    const widget = useInsightStore.getState().insights[0];
    expect(widget.curated).toBe(true);
    expect(widget.generation).toBeUndefined();
  });

  it("marks widgets as AI-generated when codeact_parts has entries", () => {
    generateInsightsTool(
      baseMessage({
        charts_data: [chartData()],
        codeact_parts: [{ type: "code_block", content: "df.plot()" }],
      }),
      addMessage
    );
    const widget = useInsightStore.getState().insights[0];
    expect(widget.curated).toBe(false);
    expect(widget.generation).toBeDefined();
    expect(widget.generation!.codeact_parts).toHaveLength(1);
  });

  it("marks widgets as curated when codeact_parts is absent", () => {
    generateInsightsTool(
      baseMessage({ charts_data: [chartData()] }),
      addMessage
    );
    const widget = useInsightStore.getState().insights[0];
    expect(widget.curated).toBe(true);
    expect(widget.generation).toBeUndefined();
  });

  it("adds an error message and does not throw when chart items are malformed", () => {
    generateInsightsTool(
      baseMessage({ charts_data: [null as unknown as object] }),
      addMessage
    );
    expect(addMessage).toHaveBeenCalledOnce();
    const msg = addMessage.mock.calls[0][0] as Omit<ChatMessage, "id">;
    expect(msg.type).toBe("error");
  });
});
