import { beforeEach, describe, expect, it } from "vitest";

import useChatStore from "@/app/store/chatStore";
import type { ChatMessage } from "@/app/types/chat";

import {
  areaCardSince,
  chatSettledSince,
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
