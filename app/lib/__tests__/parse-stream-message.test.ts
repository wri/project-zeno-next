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
  it("carries msg_type and dashboard_id through on tool messages", () => {
    const msg = parseStreamMessage(
      toolUpdate("add_to_dashboard", {
        msg_type: "dashboard_updated",
        dashboard_id: "5c9f7dd8-0000-0000-0000-000000000000",
      }),
      "tools",
      TS
    );
    expect(msg).toMatchObject({
      type: "tool",
      name: "add_to_dashboard",
      msg_type: "dashboard_updated",
      dashboard_id: "5c9f7dd8-0000-0000-0000-000000000000",
    });
  });

  it("leaves the signal fields undefined for ordinary tool messages", () => {
    const msg = parseStreamMessage(toolUpdate("pull_data"), "tools", TS);
    expect(msg?.type).toBe("tool");
    expect(msg?.msg_type).toBeUndefined();
    expect(msg?.dashboard_id).toBeUndefined();
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
