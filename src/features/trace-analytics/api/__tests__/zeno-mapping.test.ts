import { describe, expect, it } from "vitest";
import { mapTraceRow, windowIso } from "../zeno";

describe("windowIso", () => {
  it("converts an inclusive day range to half-open UTC instants", () => {
    const { start, end } = windowIso("2026-06-01", "2026-06-03");
    expect(start).toBe("2026-06-01T00:00:00.000Z");
    // End is the day AFTER endDate so the whole of endDate is included.
    expect(end).toBe("2026-06-04T00:00:00.000Z");
  });
});

describe("mapTraceRow", () => {
  it("maps Zeno list items onto analytics rows", () => {
    const row = mapTraceRow({
      id: "trace-1",
      trace_timestamp: "2026-06-01T10:30:00Z",
      environment: "production",
      session_id: "sess-1",
      user_id: " u1 ",
      latency_seconds: 2.5,
      total_cost: 0.012,
      outcome: "ANSWER",
      prompt: "hello",
      aoi_name: "Brazil",
      aoi_type: "country",
      datasets_analysed: ["Tree cover loss", "", null],
      turn_tool_calls: 3,
      turn_tokens: 1200,
      tool_error_count: 2,
      primary_dataset_name: "Tree cover loss",
      has_insight: true,
      is_global: false,
      turn_index: 3,
      insight_created_this_turn: true,
      datasets_analysed_this_turn: ["Fires", "", null],
    });

    expect(row.traceId).toBe("trace-1");
    expect(row.date).toBe("2026-06-01");
    expect(row.userId).toBe("u1");
    expect(row.datasetsAnalysed).toBe("Tree cover loss");
    expect(row.toolCallCount).toBe(3);
    expect(row.hasInternalError).toBe(true);
    expect(row.turnIndex).toBe(3);
    expect(row.insightCreatedThisTurn).toBe(true);
    expect(row.datasetsAnalysedThisTurn).toBe("Fires");
  });

  it("tolerates missing optional fields", () => {
    const row = mapTraceRow({ id: "trace-2" });
    expect(row.timestamp).toBeNull();
    expect(row.date).toBeNull();
    expect(row.prompt).toBe("");
    expect(row.toolCallCount).toBe(0);
    expect(row.hasInternalError).toBe(false);
    // Pre-backfill rows carry no turn info.
    expect(row.turnIndex).toBeNull();
    expect(row.insightCreatedThisTurn).toBeNull();
    expect(row.datasetsAnalysedThisTurn).toBe("");
  });
});

describe("filters", () => {
  it("detects machine users and honours the internal toggle", async () => {
    const { isMachineUserId, keepUserId } = await import("../../lib/filters");
    expect(isMachineUserId("gnw-machine-42")).toBe(true);
    expect(isMachineUserId("regular-user")).toBe(false);
    expect(keepUserId("gnw-machine-42", { excludeInternal: false })).toBe(
      false
    );
    expect(keepUserId("regular-user", { excludeInternal: true })).toBe(true);
  });
});

describe("csv", () => {
  it("escapes quotes, commas and newlines", async () => {
    const { toCsv } = await import("../../lib/csv");
    const csv = toCsv([{ a: 'say "hi"', b: "x,y", c: "line1\nline2" }]);
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("a,b,c");
    expect(row).toBe('"say ""hi""","x,y","line1\nline2"');
  });
});
