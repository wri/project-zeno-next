import { describe, it, expect, beforeEach, vi } from "vitest";

// The store import chain reaches the Chakra toaster (.tsx), which the node
// test environment can't parse — stub the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import useChatStore from "../chatStore";
import type { AnalyseSuggestion } from "@/app/types/chat";

const suggestion = (areaName: string): AnalyseSuggestion => ({
  areaName,
  datasetId: 4,
  datasetName: "Tree cover loss",
});

const analyseNudges = () =>
  useChatStore.getState().messages.filter((m) => m.type === "analyse-nudge");

describe("chatStore.upsertAnalyseNudge", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it("appends an analyse-nudge message carrying the suggestion", () => {
    useChatStore.getState().upsertAnalyseNudge(suggestion("Pará, Brazil"));

    const nudges = analyseNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].analyseSuggestion?.areaName).toBe("Pará, Brazil");
    expect(useChatStore.getState().messages.at(-1)?.type).toBe("analyse-nudge");
  });

  it("replaces a previous nudge instead of stacking, preserving other messages", () => {
    useChatStore.getState().upsertAnalyseNudge(suggestion("Pará, Brazil"));
    useChatStore
      .getState()
      .addMessage({ type: "assistant", message: "Narrative" });
    useChatStore.getState().upsertAnalyseNudge(suggestion("Acre, Brazil"));

    const nudges = analyseNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].analyseSuggestion?.areaName).toBe("Acre, Brazil");
    expect(
      useChatStore
        .getState()
        .messages.some(
          (m) => m.type === "assistant" && m.message === "Narrative"
        )
    ).toBe(true);
  });

  it("is cleared by reset() along with the rest of the thread", () => {
    useChatStore.getState().upsertAnalyseNudge(suggestion("Pará, Brazil"));
    useChatStore.getState().reset();
    expect(analyseNudges()).toHaveLength(0);
  });

  it("preserves accepted nudges and only replaces the pending one", () => {
    useChatStore.getState().upsertAnalyseNudge(suggestion("Pará, Brazil"));
    const accepted = analyseNudges()[0];
    useChatStore.getState().acceptAnalyseNudge(accepted.id);

    useChatStore.getState().upsertAnalyseNudge(suggestion("Acre, Brazil"));
    useChatStore.getState().upsertAnalyseNudge(suggestion("Amazonas, Brazil"));

    const nudges = analyseNudges();
    expect(nudges).toHaveLength(2);
    expect(nudges[0].analyseSuggestion).toMatchObject({
      areaName: "Pará, Brazil",
      accepted: true,
    });
    expect(nudges[1].analyseSuggestion?.areaName).toBe("Amazonas, Brazil");
    expect(nudges[1].analyseSuggestion?.accepted).toBeUndefined();
  });
});

describe("chatStore.acceptAnalyseNudge", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it("marks the targeted nudge as accepted", () => {
    useChatStore.getState().upsertAnalyseNudge(suggestion("Pará, Brazil"));
    const nudge = analyseNudges()[0];

    useChatStore.getState().acceptAnalyseNudge(nudge.id);

    expect(analyseNudges()[0].analyseSuggestion?.accepted).toBe(true);
  });

  it("leaves other messages untouched", () => {
    useChatStore
      .getState()
      .addMessage({ type: "assistant", message: "Narrative" });
    useChatStore.getState().upsertAnalyseNudge(suggestion("Pará, Brazil"));

    useChatStore.getState().acceptAnalyseNudge("not-a-real-id");

    expect(analyseNudges()[0].analyseSuggestion?.accepted).toBeUndefined();
    expect(
      useChatStore
        .getState()
        .messages.some(
          (m) => m.type === "assistant" && m.message === "Narrative"
        )
    ).toBe(true);
  });
});
