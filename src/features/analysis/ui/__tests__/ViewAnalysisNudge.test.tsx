// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The chatStore import chain reaches the Chakra toaster (.tsx) — stub it so the
// test environment can parse the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Mock the analysis hook so the component never touches the network; the test
// drives status/error and asserts on the injected run spy.
const { runSpy, analysisState } = vi.hoisted(() => ({
  runSpy: vi.fn(),
  analysisState: {
    status: "idle" as "idle" | "running" | "done" | "error",
    error: null as Error | null,
  },
}));

vi.mock("../use-analysis", () => ({
  useAnalysis: () => ({
    status: analysisState.status,
    error: analysisState.error,
    result: null,
    run: runSpy,
    cancel: vi.fn(),
  }),
}));

import ViewAnalysisNudge from "../ViewAnalysisNudge";
import useChatStore from "@/app/store/chatStore";
import type { ViewAnalysisSuggestion } from "@/app/types/chat";

const suggestion: ViewAnalysisSuggestion = {
  area: {
    name: "Pará, Brazil",
    source: "gadm",
    srcId: "BRA.14_1",
    subtype: "adm1",
  },
  datasetId: 4,
  datasetName: "Tree cover loss",
  startDate: "2001-01-01",
  endDate: "2025-12-31",
};

const renderNudge = (ui: ReactElement) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);

describe("ViewAnalysisNudge", () => {
  beforeEach(() => {
    runSpy.mockClear();
    analysisState.status = "idle";
    analysisState.error = null;
    useChatStore.getState().reset();
  });

  it("renders the View Analysis label", () => {
    renderNudge(<ViewAnalysisNudge messageId="m1" suggestion={suggestion} />);

    expect(
      screen.getByRole("button", {
        name: /View Analysis for Tree cover loss in Pará, Brazil/i,
      })
    ).toBeTruthy();
  });

  it("accepts the nudge and runs the analysis on click", () => {
    useChatStore.getState().upsertViewAnalysisNudge(suggestion);
    const messageId = useChatStore.getState().messages.at(-1)!.id;

    renderNudge(
      <ViewAnalysisNudge messageId={messageId} suggestion={suggestion} />
    );
    fireEvent.click(screen.getByRole("button"));

    expect(runSpy).toHaveBeenCalledWith({
      area: suggestion.area,
      dataset: { id: 4 },
      startDate: "2001-01-01",
      endDate: "2025-12-31",
    });

    const msg = useChatStore
      .getState()
      .messages.find((m) => m.id === messageId);
    expect(msg?.viewAnalysisSuggestion?.accepted).toBe(true);
  });

  it("does not re-run once accepted", () => {
    renderNudge(
      <ViewAnalysisNudge
        messageId="m1"
        suggestion={{ ...suggestion, accepted: true }}
      />
    );
    fireEvent.click(screen.getByRole("button"));

    expect(runSpy).not.toHaveBeenCalled();
  });

  it("signals progress while running", () => {
    analysisState.status = "running";
    renderNudge(<ViewAnalysisNudge messageId="m1" suggestion={suggestion} />);

    expect(screen.getByText("Analyzing…")).toBeTruthy();
  });

  it("shows the error message on failure", () => {
    analysisState.status = "error";
    analysisState.error = new Error("Boom");
    renderNudge(<ViewAnalysisNudge messageId="m1" suggestion={suggestion} />);

    expect(screen.getByText("Boom")).toBeTruthy();
  });
});
