import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@/app/types/chat";
import { lastConversationIndex } from "../lastConversationIndex";

function message(type: ChatMessage["type"], id: string): ChatMessage {
  return { id, type, message: "", timestamp: "2026-09-30T10:00:00.000Z" };
}

describe("lastConversationIndex", () => {
  it("is the last index when there is no profile card", () => {
    const messages = [
      message("system", "1"),
      message("user", "2"),
      message("assistant", "3"),
      message("nudge", "4"),
    ];
    expect(lastConversationIndex(messages)).toBe(messages.length - 1);
  });

  it("skips a trailing profile card so the answer above keeps its footer", () => {
    const messages = [
      message("user", "1"),
      message("assistant", "2"),
      message("assistant", "3"),
      message("profile-prompt", "4"),
    ];
    expect(lastConversationIndex(messages)).toBe(2);
  });

  it("ignores a card that isn't at the end", () => {
    const messages = [
      message("assistant", "1"),
      message("profile-prompt", "2"),
      message("assistant", "3"),
    ];
    expect(lastConversationIndex(messages)).toBe(2);
  });

  it("is -1 for an empty list", () => {
    expect(lastConversationIndex([])).toBe(-1);
  });
});
