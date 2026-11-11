import { beforeEach, describe, expect, it, vi } from "vitest";

import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { ChatMessage } from "@/app/types/chat";

import {
  KENYA_BOUNDS,
  areaCardSince,
  chatSettledSince,
  clearMap,
  flyMapTo,
  openAreasPanel,
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
    expect(sentMessageSince(2)).toBe(false);
    expect(areaCardSince(2)).toBe(false);
    expect(areaCardSince(0)).toBe(true);
  });

  it("sees the area card as soon as it arrives, mid-stream", () => {
    setChat([msg("assistant"), msg("user"), msg("area-card")], true);
    expect(areaCardSince(1)).toBe(true);
    expect(chatSettledSince(1)).toBe(false);
  });

  it("is settled once streaming stops after a sent message", () => {
    setChat([msg("user"), msg("assistant")], false);
    expect(chatSettledSince(0)).toBe(true);
    setChat([msg("assistant")], false);
    expect(chatSettledSince(0)).toBe(false);
  });
});

describe("setting the stage", () => {
  beforeEach(() => {
    useSidebarStore.setState({
      areasPanelOpen: false,
      areasPanelFilter: "mine",
    });
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
