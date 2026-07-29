import { describe, it, expect } from "vitest";
import { parseStreamMessage } from "@/app/lib/parse-stream-message";
import { LangChainUpdate } from "@/app/types/chat";

const TS = new Date("2026-06-02T00:00:00.000Z");

/**
 * Build a minimal agent (AI) LangChainUpdate. `content` is the message text
 * (empty string => pure tool-call turn) and `toolCalls` are the tool-call
 * descriptors the model emitted.
 */
function agentUpdate(
  content: unknown,
  toolCalls: Array<{ name?: unknown }> = []
): LangChainUpdate {
  return {
    messages: [
      {
        lc: 1,
        type: "constructor",
        id: ["x"],
        kwargs: {
          content,
          response_metadata: {},
          type: "ai",
          id: "msg-1",
          usage_metadata: {},
          tool_calls: toolCalls,
          invalid_tool_calls: [],
        },
      },
    ],
  } as unknown as LangChainUpdate;
}

/**
 * Build a minimal tool-result LangChainUpdate with the given
 * response_metadata (how the backend signals writes like dashboard_updated).
 */
function toolUpdate(
  name: string,
  responseMetadata: Record<string, unknown> = {}
): LangChainUpdate {
  return {
    messages: [
      {
        lc: 1,
        type: "constructor",
        id: ["x"],
        kwargs: {
          content: "ok",
          response_metadata: responseMetadata,
          type: "tool",
          name,
          id: "msg-1",
        },
      },
    ],
  } as unknown as LangChainUpdate;
}

describe("parseStreamMessage — tool response_metadata write signals", () => {
  it("carries msg_type, dashboard_id and dashboard_name through on tool messages", () => {
    const msg = parseStreamMessage(
      toolUpdate("add_to_dashboard", {
        msg_type: "dashboard_updated",
        dashboard_id: "5c9f7dd8-0000-0000-0000-000000000000",
        dashboard_name: "Paraná",
      }),
      "tools",
      TS
    );
    expect(msg).toMatchObject({
      type: "tool",
      name: "add_to_dashboard",
      msg_type: "dashboard_updated",
      dashboard_id: "5c9f7dd8-0000-0000-0000-000000000000",
      dashboard_name: "Paraná",
    });
  });

  it("leaves the signal fields undefined for ordinary tool messages", () => {
    const msg = parseStreamMessage(toolUpdate("pull_data"), "tools", TS);
    expect(msg?.type).toBe("tool");
    expect(msg?.msg_type).toBeUndefined();
    expect(msg?.dashboard_id).toBeUndefined();
  });

  it("carries the imagery state through on tool messages", () => {
    const imagery = {
      tile_url: "https://tiles.example.com/{z}/{x}/{y}.png",
      tilejson_url: "https://tiles.example.com/tilejson.json",
      mosaic_id: "abc123",
      target_date: "2026-06-15",
      aoi_names: ["Paracas"],
    };
    const update = {
      ...toolUpdate("show_imagery"),
      imagery,
    } as unknown as LangChainUpdate;

    const msg = parseStreamMessage(update, "tools", TS);
    expect(msg).toMatchObject({
      type: "tool",
      name: "show_imagery",
      imagery,
    });
  });

  it("finds the signal on an earlier message when the update ends with narration", () => {
    // The signal-bearing tool result and the agent's follow-up can arrive in
    // one update; only the last message decides the StreamMessage type, but
    // the write signal must not be lost.
    const signalBearing = toolUpdate("add_to_dashboard", {
      msg_type: "dashboard_updated",
      dashboard_id: "dash-1",
      dashboard_name: "Paraná",
    }).messages[0];
    const narration = agentUpdate("Added it to your dashboard.").messages[0];
    const update = {
      messages: [signalBearing, narration],
    } as unknown as LangChainUpdate;

    const msg = parseStreamMessage(update, "agent", TS);
    expect(msg).toMatchObject({
      type: "text",
      text: "Added it to your dashboard.",
      msg_type: "dashboard_updated",
      dashboard_id: "dash-1",
      dashboard_name: "Paraná",
    });
  });

  it("extracts a state-level insight_id on tool messages", () => {
    // generate_insights streams the persisted insight uuid alongside
    // charts_data — the handle for the chat-side "Add to dashboard" toggle.
    const update = toolUpdate("generate_insights");
    (update as unknown as { insight_id: string }).insight_id = "ins-1";

    const msg = parseStreamMessage(update, "tools", TS);
    expect(msg?.type).toBe("tool");
    expect(msg?.insight_id).toBe("ins-1");
  });

  it("carries insight_updated through on tool messages", () => {
    // update_insight_display (rename a chart, change its type) signals with
    // insight_updated — the dashboard page relies on it to refetch widgets
    // whose embedded insight changed.
    const msg = parseStreamMessage(
      toolUpdate("update_insight_display", {
        msg_type: "insight_updated",
        insight_id: "ins-1",
      }),
      "tools",
      TS
    );
    expect(msg?.type).toBe("tool");
    expect(msg?.msg_type).toBe("insight_updated");
  });

  it("keeps the signal when the tool message is classified as an error", () => {
    const update = toolUpdate("add_to_dashboard", {
      msg_type: "dashboard_updated",
      dashboard_id: "dash-1",
    });
    // An error status routes the message down the error branch.
    (update.messages[0].kwargs as { status?: string }).status = "error";

    const msg = parseStreamMessage(update, "tools", TS);
    expect(msg?.type).toBe("error");
    expect(msg?.msg_type).toBe("dashboard_updated");
    expect(msg?.dashboard_id).toBe("dash-1");
  });
});

describe("parseStreamMessage — tool error classification", () => {
  it("classifies a status=error tool message as an error", () => {
    const update = toolUpdate("create_dashboard");
    (update.messages[0].kwargs as { status?: string }).status = "error";
    update.messages[0].kwargs.content =
      "The current selection spans 2 areas. Ask the user which one.";

    const msg = parseStreamMessage(update, "tools", TS);
    expect(msg).toMatchObject({ type: "error", name: "create_dashboard" });
  });

  it("classifies a legacy 'Error:'-prefixed tool message as an error", () => {
    const update = toolUpdate("pull_data");
    update.messages[0].kwargs.content = "Error: upstream service unavailable";

    const msg = parseStreamMessage(update, "tools", TS);
    expect(msg?.type).toBe("error");
  });

  it("keeps a successful tool message that mentions 'Error:' mid-content as a tool message", () => {
    const update = toolUpdate("pull_data");
    update.messages[0].kwargs.content =
      "Pulled 16 data points. One row was skipped (Error: bad geometry).";

    const msg = parseStreamMessage(update, "tools", TS);
    expect(msg?.type).toBe("tool");
  });
});

describe("parseStreamMessage — agent tool_calls", () => {
  it("attaches tool_calls names to a text message", () => {
    const msg = parseStreamMessage(
      agentUpdate("Let me analyse that for you.", [
        { name: "generate_insights" },
      ]),
      "agent",
      TS
    );
    expect(msg).toMatchObject({
      type: "text",
      text: "Let me analyse that for you.",
      tool_calls: ["generate_insights"],
    });
  });

  it("surfaces a pure tool-call turn as an 'other' message", () => {
    const msg = parseStreamMessage(
      agentUpdate("", [{ name: "generate_insights" }]),
      "agent",
      TS
    );
    expect(msg).toMatchObject({
      type: "other",
      name: "tool_calls",
      tool_calls: ["generate_insights"],
    });
  });

  it("omits tool_calls when the agent only emits text", () => {
    const msg = parseStreamMessage(
      agentUpdate("Here are the results.", []),
      "agent",
      TS
    );
    expect(msg?.type).toBe("text");
    expect(msg?.tool_calls).toBeUndefined();
  });

  it("returns null when there is neither text nor tool calls", () => {
    const msg = parseStreamMessage(agentUpdate("", []), "agent", TS);
    expect(msg).toBeNull();
  });

  it("ignores malformed tool-call entries without a name", () => {
    const msg = parseStreamMessage(
      agentUpdate("", [{ args: {} } as { name?: unknown }]),
      "agent",
      TS
    );
    // No usable names => behaves like a no-content, no-tool-call turn.
    expect(msg).toBeNull();
  });

  it("preserves multiple tool-call names in order", () => {
    const msg = parseStreamMessage(
      agentUpdate("", [
        { name: "pick_dataset" },
        { name: "generate_insights" },
      ]),
      "agent",
      TS
    );
    expect(msg?.tool_calls).toEqual(["pick_dataset", "generate_insights"]);
  });
});
