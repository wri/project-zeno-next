"use client";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/app/types/chat";
import { PromptRect, resolvePinnedPromptId } from "@/app/utils/pinnedPrompt";

/**
 * Offset used when scrolling a prompt bubble back into view. Matches the
 * pin-on-send offset in ChatMessages so a jumped-to prompt lands exactly
 * where a freshly sent one does.
 */
const JUMP_OFFSET_PX = 16;

/**
 * Tracks which user prompt should be pinned above the chat scroll area and
 * exposes the plumbing ChatMessages needs to drive the PinnedPrompt overlay.
 *
 * ChatMessages renders inside a scrollable parent it does not own (each chat
 * panel variant provides its own scroller), so geometry is measured against
 * `containerRef.current.parentElement` — the same contract the existing
 * auto-scroll logic in ChatMessages relies on.
 */
export function usePinnedPrompt(
  containerRef: RefObject<HTMLDivElement | null>,
  messages: ChatMessage[]
) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const promptNodesRef = useRef(new Map<string, HTMLElement>());
  const refCallbacksRef = useRef(
    new Map<string, (node: HTMLElement | null) => void>()
  );
  const frameRef = useRef<number | null>(null);
  // Read through a ref so scroll/resize subscriptions stay stable across the
  // frequent message appends that happen while a response streams in.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const computePinned = useCallback(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) {
      setPinnedId(null);
      return;
    }
    const containerTop = parent.getBoundingClientRect().top;
    const prompts: PromptRect[] = [];
    for (const message of messagesRef.current) {
      if (message.type !== "user") continue;
      const node = promptNodesRef.current.get(message.id);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      prompts.push({ id: message.id, top: rect.top, bottom: rect.bottom });
      // resolvePinnedPromptId stops at the first prompt still crossing or below
      // the container top, so measuring any further prompts is wasted layout
      // work — bail as soon as we've collected that boundary prompt.
      if (rect.bottom > containerTop) break;
    }
    setPinnedId(resolvePinnedPromptId(prompts, containerTop));
  }, [containerRef]);

  const schedulePinnedUpdate = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      computePinned();
    });
  }, [computePinned]);

  // Follow scroll position.
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    parent.addEventListener("scroll", schedulePinnedUpdate, { passive: true });
    return () => {
      parent.removeEventListener("scroll", schedulePinnedUpdate);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [containerRef, schedulePinnedUpdate]);

  // Follow layout shifts from streamed content growing below the fold.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(schedulePinnedUpdate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, schedulePinnedUpdate]);

  // Recompute when the message list itself changes (send, stream, replay).
  useEffect(() => {
    schedulePinnedUpdate();
  }, [messages, schedulePinnedUpdate]);

  /**
   * Stable per-id ref callback for a user message's root node. Returning a
   * cached callback keeps React from detaching/re-attaching refs on every
   * render (and from misreading a non-void return as a React 19 ref cleanup).
   */
  const registerPromptNode = useCallback((id: string) => {
    const cached = refCallbacksRef.current.get(id);
    if (cached) return cached;
    const callback = (node: HTMLElement | null) => {
      if (node) {
        promptNodesRef.current.set(id, node);
      } else {
        promptNodesRef.current.delete(id);
      }
    };
    refCallbacksRef.current.set(id, callback);
    return callback;
  }, []);

  /** Scroll the pinned prompt's original bubble back to the top of the view. */
  const jumpToPinnedPrompt = useCallback(() => {
    const parent = containerRef.current?.parentElement;
    const node = pinnedId ? promptNodesRef.current.get(pinnedId) : undefined;
    if (!parent || !node) return;
    const delta =
      node.getBoundingClientRect().top -
      parent.getBoundingClientRect().top -
      JUMP_OFFSET_PX;
    parent.scrollTo({ top: parent.scrollTop + delta, behavior: "smooth" });
  }, [containerRef, pinnedId]);

  const pinnedMessage =
    messages.find((message) => message.id === pinnedId) ?? null;

  return { pinnedMessage, registerPromptNode, jumpToPinnedPrompt };
}
