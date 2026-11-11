import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/src/features/analysis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/features/analysis")>()),
  cancelRunningAnalyses: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import { cancelRunningAnalyses } from "@/src/features/analysis";
import {
  agentTextLine,
  ndjsonResponse,
} from "@/app/store/__tests__/stream-fixtures";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { ChatMessage } from "@/app/types/chat";

import {
  KENYA_BOUNDS,
  answerFailedSince,
  answeredCount,
  areaCardSince,
  chatMessageCount,
  chatSettledSince,
  clearMap,
  flyMapTo,
  openAreasPanel,
  openDataCatalog,
  sentMessageSince,
} from "../app-actions";

const msg = (type: ChatMessage["type"], extra: Partial<ChatMessage> = {}) =>
  ({
    id: Math.random().toString(36),
    type,
    message: "",
    timestamp: new Date().toISOString(),
    ...extra,
  }) as ChatMessage;

const setChat = (messages: ChatMessage[], isLoading = false) =>
  useChatStore.setState({ messages, isLoading });

beforeEach(() => setChat([]));

describe("chat progress predicates", () => {
  it("ignores messages from before the baseline", () => {
    setChat([msg("user"), msg("area-card")]);
    const baseline = chatMessageCount();
    expect(sentMessageSince(baseline)).toBe(false);
    expect(areaCardSince(baseline)).toBe(false);
    expect(areaCardSince(0)).toBe(true);
  });

  it("sees the area card as soon as it arrives, mid-stream", () => {
    setChat([msg("assistant")]);
    const baseline = chatMessageCount();
    setChat([msg("assistant"), msg("user"), msg("area-card")], true);
    expect(areaCardSince(baseline)).toBe(true);
    expect(chatSettledSince(baseline)).toBe(false);
  });

  it("is settled once streaming stops after a sent message", () => {
    setChat([msg("user"), msg("assistant")], false);
    expect(chatSettledSince(0)).toBe(true);
    setChat([msg("assistant")], false);
    expect(chatSettledSince(0)).toBe(false);
  });

  it("sees the next question when a message before the baseline goes", () => {
    setChat([msg("assistant"), msg("analyse-nudge")]);
    const baseline = chatMessageCount();
    setChat([msg("assistant"), msg("user")]);
    expect(sentMessageSince(baseline)).toBe(true);
  });

  it("sees the next question when sending it drops a profile ask", async () => {
    useChatStore.getState().reset();
    useChatStore.getState().addMessage({ type: "assistant", message: "A" });
    useChatStore.getState().upsertProfileAsk("profile-prompt");
    const baseline = chatMessageCount();
    vi.mocked(apiFetch).mockResolvedValue(ndjsonResponse([agentTextLine("B")]));

    await useChatStore.getState().sendMessage("Tree cover loss in Kenya");

    const { messages } = useChatStore.getState();
    // The shift: the ask is gone, so the question took its index.
    expect(messages.some((m) => m.transient)).toBe(false);
    expect(sentMessageSince(baseline)).toBe(true);
    expect(chatSettledSince(baseline)).toBe(true);
  });
});

describe("answerFailedSince", () => {
  beforeEach(() => useChatStore.setState({ completedAnswers: 2 }));

  it("is false until a question was sent and has finished", () => {
    const answers = answeredCount();
    expect(answerFailedSince(0, answers)).toBe(false);
    setChat([msg("user")], true);
    expect(answerFailedSince(0, answers)).toBe(false);
  });

  it("is true when the question finished without an answer", () => {
    const answers = answeredCount();
    setChat([msg("user"), msg("error")], false);
    expect(answerFailedSince(0, answers)).toBe(true);
  });

  it("is false when the chat store counted the answer", () => {
    const answers = answeredCount();
    setChat([msg("user"), msg("assistant")], false);
    useChatStore.setState({ completedAnswers: answers + 1 });
    expect(answerFailedSince(0, answers)).toBe(false);
  });
});

describe("setting the stage", () => {
  beforeEach(() => {
    useSidebarStore.setState({
      areasPanelOpen: false,
      areasPanelFilter: "mine",
      catalogCategory: "wildfires",
    });
  });

  it("stops a chart still loading, so it can't land on the cleared map", () => {
    vi.mocked(cancelRunningAnalyses).mockClear();
    clearMap();
    expect(cancelRunningAnalyses).toHaveBeenCalledTimes(1);
  });

  it("clears the map back to the All catalogue category, so every tour row shows", () => {
    clearMap();
    expect(useSidebarStore.getState().catalogCategory).toBe("all");
  });

  it("opens the Data Catalog on All, whatever category was last picked", () => {
    openDataCatalog();
    const { dataCatalogOpen, catalogCategory } = useSidebarStore.getState();
    expect(dataCatalogOpen).toBe(true);
    expect(catalogCategory).toBe("all");
  });

  it("clears the map back to the Boundaries tab, where the tour's cards are", () => {
    clearMap();
    expect(useSidebarStore.getState().areasPanelFilter).toBe("boundaries");
  });

  it("opens the Areas panel on Boundaries, whatever tab was last used", () => {
    openAreasPanel();
    const { areasPanelOpen, areasPanelFilter } = useSidebarStore.getState();
    expect(areasPanelOpen).toBe(true);
    expect(areasPanelFilter).toBe("boundaries");
  });

  it("frames bounds through the map's own clear-of-the-chrome fit", () => {
    const flyToBounds = vi.fn();
    useMapStore.setState({ flyToBounds });
    flyMapTo(KENYA_BOUNDS);
    expect(flyToBounds).toHaveBeenCalledWith([
      [33.7, -4.9],
      [42.1, 5.2],
    ]);
  });
});
