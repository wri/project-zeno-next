import { describe, it, expect, beforeEach, vi } from "vitest";

// contextStore imports a React component (ContextButton) — mock to avoid JSX
// in the node test environment
vi.mock("@/app/store/contextStore", () => ({
  default: { getState: () => ({ context: [] }) },
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

  it("adds the static reference message to chat as assistant type", () => {
    generateInsightsTool(
      baseMessage({ charts_data: [chartData()] }),
      addMessage
    );
    expect(addMessage).toHaveBeenCalledOnce();
    const msg = addMessage.mock.calls[0][0] as Omit<ChatMessage, "id">;
    expect(msg.type).toBe("assistant");
    expect(msg.message).toBe(
      "I've created an insight you can view on the map."
    );
  });

  it("does nothing when charts_data is absent", () => {
    generateInsightsTool(baseMessage(), addMessage);
    expect(useInsightStore.getState().insights).toHaveLength(0);
    expect(addMessage).not.toHaveBeenCalled();
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
