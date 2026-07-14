import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

// useErrorHandler pulls in the Chakra toaster (.tsx/JSX), which the node test
// environment can't transform. We only care about message state here, not toasts.
vi.mock("@/app/hooks/useErrorHandler", () => ({
  showApiError: vi.fn(),
  showError: vi.fn(),
  showServiceUnavailableError: vi.fn(),
}));

// The store import chain also reaches the Chakra toaster (.tsx) directly — stub
// the module boundary so node can parse it.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import useChatStore from "../chatStore";
import useViewContextStore from "../viewContextStore";
import useAuthStore from "../authStore";
import useAgentProfileStore from "../agentProfileStore";
import { apiFetch } from "@/app/lib/api-client";
import type {
  AnalyseSuggestion,
  ViewAnalysisSuggestion,
} from "@/app/types/chat";

// Error that mimics a fetch/stream abort: `name === "AbortError"` is what
// chatStore.sendMessage keys off of to take its abort branch.
function abortError(): Error {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return err;
}

// A Response-like object whose reader stays pending until the request's
// AbortSignal fires, then rejects with an AbortError — i.e. exactly how a real
// streaming fetch behaves when the AbortController is triggered mid-stream.
function makeAbortableResponse(signal: AbortSignal): Response {
  const reader = {
    read: () =>
      new Promise((_resolve, reject) => {
        if (signal.aborted) {
          reject(abortError());
          return;
        }
        signal.addEventListener("abort", () => reject(abortError()), {
          once: true,
        });
      }),
    releaseLock: () => {},
    cancel: () => Promise.resolve(),
  };

  return {
    ok: true,
    headers: new Headers(),
    body: { getReader: () => reader },
  } as unknown as Response;
}

describe("chatStore cancellation", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    vi.mocked(apiFetch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("cancelRequest", () => {
    it("aborts the stored controller and clears it from state", () => {
      const controller = new AbortController();
      useChatStore.setState({ abortController: controller });

      useChatStore.getState().cancelRequest();

      expect(controller.signal.aborted).toBe(true);
      expect(useChatStore.getState().abortController).toBeNull();
    });

    it("is a safe no-op when there is no in-flight request", () => {
      expect(useChatStore.getState().abortController).toBeNull();
      expect(() => useChatStore.getState().cancelRequest()).not.toThrow();
      expect(useChatStore.getState().abortController).toBeNull();
    });
  });

  describe("sendMessage abort handling", () => {
    it("renders a neutral 'stopped' message (not an error) on user cancel", async () => {
      vi.mocked(apiFetch).mockImplementation((_path, init) =>
        Promise.resolve(makeAbortableResponse(init!.signal as AbortSignal))
      );

      const promise = useChatStore.getState().sendMessage("hello");
      // sendMessage runs synchronously up to the first await, so the controller
      // is already in state here. cancelRequest() nulls it *before* aborting,
      // which is how the catch block detects a user cancel vs. a timeout.
      useChatStore.getState().cancelRequest();
      await promise;

      const messages = useChatStore.getState().messages;
      expect(messages.some((m) => m.type === "stopped")).toBe(true);
      expect(messages.some((m) => m.type === "error")).toBe(false);
      expect(useChatStore.getState().isLoading).toBe(false);
      expect(useChatStore.getState().abortController).toBeNull();
    });

    it("renders an error message when the abort comes from the timeout", async () => {
      vi.mocked(apiFetch).mockImplementation((_path, init) =>
        Promise.resolve(makeAbortableResponse(init!.signal as AbortSignal))
      );

      const promise = useChatStore.getState().sendMessage("hello");
      // Simulate the client-timeout path: it aborts the controller directly
      // without nulling state, so the catch block sees abortController !== null.
      useChatStore.getState().abortController?.abort();
      await promise;

      const messages = useChatStore.getState().messages;
      expect(messages.some((m) => m.type === "error")).toBe(true);
      expect(messages.some((m) => m.type === "stopped")).toBe(false);
      expect(useChatStore.getState().isLoading).toBe(false);
    });
  });
});

describe("chatStore view_context", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useViewContextStore.setState({ viewContext: null });
    vi.mocked(apiFetch).mockReset();
    // A failed response ends sendMessage on its error path immediately; the
    // request body we assert on has already been built by then.
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
    } as unknown as Response);
  });

  afterEach(() => {
    useViewContextStore.setState({ viewContext: null });
    vi.clearAllMocks();
  });

  const sentBody = (): Record<string, unknown> => {
    const init = vi.mocked(apiFetch).mock.calls[0]?.[1];
    return JSON.parse((init?.body as string) ?? "{}");
  };

  it("includes view_context in the POST body when a surface is registered", async () => {
    useViewContextStore.getState().setViewContext({
      page: "dashboard",
      dashboard_id: "5c9f7dd8-0000-0000-0000-000000000000",
      dashboard_name: "Paraná",
    });

    await useChatStore.getState().sendMessage("refine this dashboard");

    expect(sentBody().view_context).toEqual({
      page: "dashboard",
      dashboard_id: "5c9f7dd8-0000-0000-0000-000000000000",
      dashboard_name: "Paraná",
    });
  });

  it("omits view_context when no surface has registered", async () => {
    await useChatStore.getState().sendMessage("hello");

    expect(sentBody()).not.toHaveProperty("view_context");
  });
});

describe("chatStore ff (agent profile default)", () => {
  const sentBody = (): Record<string, unknown> => {
    const init = vi.mocked(apiFetch).mock.calls[0]?.[1];
    return JSON.parse((init?.body as string) ?? "{}");
  };

  const stubUrl = (search: string) =>
    vi.stubGlobal("window", { location: { search } });

  beforeEach(() => {
    useChatStore.getState().reset();
    useViewContextStore.setState({ viewContext: null });
    useAuthStore.setState({ userType: null });
    useAgentProfileStore.setState({ agentProfile: null });
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
    } as unknown as Response);
  });

  afterEach(() => {
    useViewContextStore.setState({ viewContext: null });
    useAuthStore.setState({ userType: null });
    useAgentProfileStore.setState({ agentProfile: null });
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("defaults ff to experimental when the ?ff=dashboard gate is open for a privileged user", async () => {
    useAuthStore.setState({ userType: "admin" });
    stubUrl("?ff=dashboard");

    await useChatStore.getState().sendMessage("hi");

    expect(sentBody().ff).toBe("experimental");
  });

  it("omits ff for a non-privileged user even with ?ff=dashboard", async () => {
    useAuthStore.setState({ userType: "regular" });
    stubUrl("?ff=dashboard");

    await useChatStore.getState().sendMessage("hi");

    expect(sentBody()).not.toHaveProperty("ff");
  });

  it("omits ff on the map surface when the dashboard gate is closed", async () => {
    useAuthStore.setState({ userType: "admin" });
    stubUrl("?ff=analysis");

    await useChatStore.getState().sendMessage("hi");

    expect(sentBody()).not.toHaveProperty("ff");
  });

  it("still defaults to experimental on a dashboard surface without ?ff in the URL", async () => {
    useAuthStore.setState({ userType: "admin" });
    useViewContextStore.getState().setViewContext({
      page: "dashboard",
      dashboard_id: "5c9f7dd8-0000-0000-0000-000000000000",
    });
    stubUrl("");

    await useChatStore.getState().sendMessage("hi");

    expect(sentBody().ff).toBe("experimental");
  });
});

const suggestion = (areaName: string): AnalyseSuggestion => ({
  areaName,
  datasetId: 4,
  datasetName: "Tree cover loss",
});

const analyseNudges = () =>
  useChatStore.getState().messages.filter((m) => m.type === "analyse-nudge");

const viewSuggestion = (areaName: string): ViewAnalysisSuggestion => ({
  area: { name: areaName, source: "gadm", srcId: "BRA.14_1", subtype: "adm1" },
  datasetId: 4,
  datasetName: "Tree cover loss",
  startDate: "2001-01-01",
  endDate: "2025-12-31",
});

const viewAnalysisNudges = () =>
  useChatStore
    .getState()
    .messages.filter((m) => m.type === "view-analysis-nudge");

describe("chatStore.upsertViewAnalysisNudge", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it("appends a view-analysis-nudge message carrying the suggestion", () => {
    useChatStore
      .getState()
      .upsertViewAnalysisNudge(viewSuggestion("Pará, Brazil"));

    const nudges = viewAnalysisNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].viewAnalysisSuggestion?.area.name).toBe("Pará, Brazil");
    expect(useChatStore.getState().messages.at(-1)?.type).toBe(
      "view-analysis-nudge"
    );
  });

  it("replaces the pending nudge but preserves accepted ones", () => {
    useChatStore
      .getState()
      .upsertViewAnalysisNudge(viewSuggestion("Pará, Brazil"));
    const accepted = viewAnalysisNudges()[0];
    useChatStore.getState().acceptViewAnalysisNudge(accepted.id);

    useChatStore
      .getState()
      .upsertViewAnalysisNudge(viewSuggestion("Acre, Brazil"));
    useChatStore
      .getState()
      .upsertViewAnalysisNudge(viewSuggestion("Amazonas, Brazil"));

    const nudges = viewAnalysisNudges();
    expect(nudges).toHaveLength(2);
    expect(nudges[0].viewAnalysisSuggestion).toMatchObject({
      datasetId: 4,
      accepted: true,
    });
    expect(nudges[0].viewAnalysisSuggestion?.area.name).toBe("Pará, Brazil");
    expect(nudges[1].viewAnalysisSuggestion?.area.name).toBe(
      "Amazonas, Brazil"
    );
    expect(nudges[1].viewAnalysisSuggestion?.accepted).toBeUndefined();
  });

  it("is cleared by reset() along with the rest of the thread", () => {
    useChatStore
      .getState()
      .upsertViewAnalysisNudge(viewSuggestion("Pará, Brazil"));
    useChatStore.getState().reset();
    expect(viewAnalysisNudges()).toHaveLength(0);
  });
});

describe("chatStore.acceptViewAnalysisNudge", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it("marks the targeted nudge as accepted", () => {
    useChatStore
      .getState()
      .upsertViewAnalysisNudge(viewSuggestion("Pará, Brazil"));
    const nudge = viewAnalysisNudges()[0];

    useChatStore.getState().acceptViewAnalysisNudge(nudge.id);

    expect(viewAnalysisNudges()[0].viewAnalysisSuggestion?.accepted).toBe(true);
  });
});

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
