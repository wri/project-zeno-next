import { describe, expect, it } from "vitest";

import { CURATED_ANALYSES } from "@/src/features/analysis";
import {
  CURATED_SUGGESTED_MODULES,
  curatedTileStatus,
  SUGGESTED_MODULES,
  SUGGESTED_PROMPT_MODULES,
} from "../suggested-modules";

describe("SUGGESTED_MODULES", () => {
  it("gives every card a unique id and a non-empty label and icon", () => {
    const ids = SUGGESTED_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of SUGGESTED_MODULES) {
      expect(card.label.trim()).not.toBe("");
      expect(card.icon).toBeTruthy();
    }
  });

  it("lists every curated analysis of the suite, in suite order, before any prompt tile", () => {
    expect(CURATED_SUGGESTED_MODULES.map((m) => m.datasetId)).toEqual(
      CURATED_ANALYSES.map((e) => e.datasetId)
    );
    const firstPrompt = SUGGESTED_MODULES.findIndex((m) => m.kind === "prompt");
    const lastCurated = SUGGESTED_MODULES.map((m) => m.kind).lastIndexOf(
      "curated"
    );
    expect(lastCurated).toBeLessThan(firstPrompt);
  });

  it("keeps the curated labels in the row's verb-phrase voice", () => {
    const byId = new Map(
      CURATED_SUGGESTED_MODULES.map((m) => [m.datasetId, m])
    );
    expect(byId.get(4)?.label).toBe("Tree cover loss analysis");
    expect(byId.get(8)?.label).toBe("Tree cover loss by driver");
    expect(byId.get(11)?.label).toBe("Monitor disturbance alerts");
  });
});

describe("SUGGESTED_PROMPT_MODULES", () => {
  it("only holds the chat-driven tiles, each with a non-empty prompt", () => {
    expect(SUGGESTED_PROMPT_MODULES.map((m) => m.id)).toEqual([
      "compare-regions",
      "recent-satellite-imagery",
      "summarise-dashboard",
    ]);
    for (const card of SUGGESTED_PROMPT_MODULES) {
      expect(card.prompt.trim()).not.toBe("");
    }
  });

  it("scopes every analysis prompt to the current area and asks for a text block and a map", () => {
    const analysisCards = SUGGESTED_PROMPT_MODULES.filter(
      (m) => m.promptKind === "analysis"
    );
    expect(analysisCards.length).toBeGreaterThan(0);
    for (const card of analysisCards) {
      const prompt = card.prompt.toLowerCase();
      expect(prompt).toContain("this area");
      expect(prompt).toContain("text block");
      expect(prompt).toContain("map");
    }
  });

  it("keeps the satellite imagery card a plain content add, not an analysis", () => {
    const imagery = SUGGESTED_PROMPT_MODULES.find(
      (m) => m.id === "recent-satellite-imagery"
    );
    expect(imagery?.promptKind).toBe("action");
  });

  it("has the dashboard-summary card ask for a text block, but not a fresh analysis", () => {
    const summary = SUGGESTED_PROMPT_MODULES.find(
      (m) => m.id === "summarise-dashboard"
    );
    expect(summary?.promptKind).toBe("action");
    expect(summary?.prompt.toLowerCase()).toContain("text block");
  });
});

describe("curatedTileStatus", () => {
  it("marks a tile whose analysis is already on the dashboard, ahead of pending", () => {
    expect(curatedTileStatus(true, false)).toBe("on-dashboard");
    expect(curatedTileStatus(true, true)).toBe("on-dashboard");
  });

  it("marks a tile whose analysis is on its way as pending", () => {
    expect(curatedTileStatus(false, true)).toBe("pending");
  });

  it("is idle otherwise", () => {
    expect(curatedTileStatus(false, false)).toBe("idle");
  });
});
