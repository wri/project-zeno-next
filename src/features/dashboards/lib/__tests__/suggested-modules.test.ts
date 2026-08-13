import { describe, expect, it } from "vitest";

import { SUGGESTED_PROMPT_MODULES } from "../suggested-modules";

describe("SUGGESTED_PROMPT_MODULES", () => {
  it("gives every card a unique id", () => {
    const ids = SUGGESTED_PROMPT_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every card a non-empty label, icon, and prompt", () => {
    for (const card of SUGGESTED_PROMPT_MODULES) {
      expect(card.label.trim()).not.toBe("");
      expect(card.icon).toBeTruthy();
      expect(card.prompt.trim()).not.toBe("");
    }
  });

  it("scopes every prompt to the current area, per the chat pipeline's ui_context", () => {
    for (const card of SUGGESTED_PROMPT_MODULES) {
      expect(card.prompt.toLowerCase()).toContain("this area");
    }
  });

  it("has every analysis card ask for a text block and a map alongside the analysis", () => {
    const analysisCards = SUGGESTED_PROMPT_MODULES.filter(
      (m) => m.kind === "analysis"
    );
    expect(analysisCards.length).toBeGreaterThan(0);
    for (const card of analysisCards) {
      const prompt = card.prompt.toLowerCase();
      expect(prompt).toContain("text block");
      expect(prompt).toContain("map");
    }
  });

  it("keeps the satellite imagery card a plain content add, not an analysis", () => {
    const imagery = SUGGESTED_PROMPT_MODULES.find(
      (m) => m.id === "recent-satellite-imagery"
    );
    expect(imagery?.kind).toBe("action");
  });
});
