import type { ChatMessage } from "@/app/types/chat";

/**
 * Index of the message MessageBubble should treat as the last one. A
 * trailing profile card (front door) is an ask about the person, not part of
 * the conversation, so it mustn't take "last" away from the answer above it:
 * the footer (copy, rating) of a multi-part answer depends on being last.
 * Without such a card this is simply the last index.
 */
export function lastConversationIndex(messages: ChatMessage[]): number {
  return messages.findLastIndex((m) => m.type !== "profile-prompt");
}
