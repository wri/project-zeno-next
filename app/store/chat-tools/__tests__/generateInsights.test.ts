import { describe, it, expect, beforeEach, vi } from "vitest";

// generateInsights reads the active dataset/area from mapStore and the date
// range from chatStore. Both stores' import chains reach the Chakra toaster
// (.tsx) — mock them to avoid JSX in the node test environment.
vi.mock("@/app/store/mapStore", () => ({
  default: { getState: () => ({ layers: [] }) },
}));

vi.mock("@/app/store/chatStore", () => ({
  default: { getState: () => ({ dateRange: null }) },
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
