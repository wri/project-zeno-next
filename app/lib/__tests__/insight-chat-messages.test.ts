import { describe, it, expect } from "vitest";
import { buildInsightChatMessages } from "@/app/lib/insight-chat-messages";
import { InsightWidget } from "@/app/types/chat";

const TS = "2026-06-02T00:00:00.000Z";
const TRACE = "trace-123";

function widget(id: string, title: string): InsightWidget {
  return {
    id,
    type: "bar",
    title,
    description: "",
    data: [],
    xAxis: "x",
    yAxis: "y",
  };
}

describe("buildInsightChatMessages", () => {
  describe("fallback path (no [Chart N] markers — current staging)", () => {
    it("renders pending cards before the assistant text", () => {
      const widgets = [widget("chart_0", "A"), widget("chart_1", "B")];
      const msgs = buildInsightChatMessages(
        "Here is your analysis.",
        widgets,
        TS,
        TRACE
      );

      expect(msgs).toHaveLength(3);
      // 1) + 2) one card per pending widget, in order, before the narrative
      expect(msgs[0]).toMatchObject({ type: "assistant", message: "" });
      expect(msgs[0].widgets?.[0]?.title).toBe("A");
      expect(msgs[0].suppressFooter).toBe(true);
      expect(msgs[1].widgets?.[0]?.title).toBe("B");
      expect(msgs[1].suppressFooter).toBe(true);
      // 3) the narrative is the terminal message: shows footer, carries trace
      expect(msgs[2]).toMatchObject({
        type: "assistant",
        message: "Here is your analysis.",
        traceId: TRACE,
      });
      expect(msgs[2].suppressFooter).toBeUndefined();
    });

    it("emits only the text (with trace) when there are no pending cards", () => {
      const msgs = buildInsightChatMessages("Just a reply.", [], TS, TRACE);

      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toMatchObject({
        type: "assistant",
        message: "Just a reply.",
        traceId: TRACE,
      });
      expect(msgs[0].suppressFooter).toBeUndefined();
    });
  });

  describe("marker path ([Chart N] present)", () => {
    it("places cards positionally where markers appear", () => {
      const widgets = [widget("chart_0", "A"), widget("chart_1", "B")];
      const msgs = buildInsightChatMessages(
        "Intro [Chart 1] middle [Chart 2] outro",
        widgets,
        TS,
        TRACE
      );

      // text, card A, text, card B, text
      expect(msgs.map((m) => m.message)).toEqual([
        "Intro ",
        "",
        " middle ",
        "",
        " outro",
      ]);
      expect(msgs[1].widgets?.[0]?.title).toBe("A");
      expect(msgs[3].widgets?.[0]?.title).toBe("B");
      // trailing text is the last segment, so it carries the trace
      expect(msgs[4].traceId).toBe(TRACE);
      // non-terminal text segments suppress their footer
      expect(msgs[0].suppressFooter).toBe(true);
    });

    it("places a card at a lowercase [Chart <uuid>] marker", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const widgets = [widget(uuid, "A")];
      const msgs = buildInsightChatMessages(
        `See [Chart ${uuid}] above.`,
        widgets,
        TS,
        TRACE
      );

      // text, card, text
      expect(msgs.map((m) => m.message)).toEqual(["See ", "", " above."]);
      expect(msgs[1].widgets?.[0]?.title).toBe("A");
      // trailing text is the last segment, so it carries the trace
      expect(msgs[2].traceId).toBe(TRACE);
    });

    it("places cards at multiple [Chart <uuid>] markers, in order", () => {
      const uuidA = "550e8400-e29b-41d4-a716-446655440000";
      const uuidB = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
      const widgets = [widget(uuidA, "A"), widget(uuidB, "B")];
      const msgs = buildInsightChatMessages(
        `Intro [Chart ${uuidA}] middle [Chart ${uuidB}] outro`,
        widgets,
        TS,
        TRACE
      );

      expect(msgs.map((m) => m.message)).toEqual([
        "Intro ",
        "",
        " middle ",
        "",
        " outro",
      ]);
      expect(msgs[1].widgets?.[0]?.title).toBe("A");
      expect(msgs[3].widgets?.[0]?.title).toBe("B");
      expect(msgs[4].traceId).toBe(TRACE);
    });

    it("matches an uppercase [Chart <uuid>] marker (case-insensitive)", () => {
      const uuid = "550E8400-E29B-41D4-A716-446655440000";
      const widgets = [widget(uuid, "A")];
      const msgs = buildInsightChatMessages(`[Chart ${uuid}]`, widgets, TS);

      // marker is the whole message, so only the injected card remains
      expect(msgs).toHaveLength(1);
      expect(msgs[0].widgets?.[0]?.title).toBe("A");
    });

    it("skips markers that have no matching pending widget", () => {
      const msgs = buildInsightChatMessages(
        "Intro [Chart 1] outro",
        [], // no widgets available
        TS
      );
      // only the surrounding text survives; the unmatched marker is dropped
      expect(msgs.map((m) => m.message)).toEqual(["Intro ", " outro"]);
      expect(msgs.every((m) => !m.widgets)).toBe(true);
    });
  });
});
