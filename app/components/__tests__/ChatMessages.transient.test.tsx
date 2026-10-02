// @vitest-environment happy-dom
/**
 * A transient message (the front door's profile card) trailing the
 * conversation mustn't take "last" from the answer above it: the final part
 * of a narrated answer shows its copy/rating footer only because it is last.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Nothing here may reach the network.
vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(() => new Promise(() => {})),
  getToken: () => null,
}));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import system from "@/app/theme";
import { queryClient } from "@/app/lib/query-client";
import useChatStore from "@/app/store/chatStore";
import {
  profileOptionsQuery,
  profilePrefillQuery,
} from "@/src/features/front-door/api/queries";
import ChatMessages from "../ChatMessages";

const TIMESTAMP = "2026-09-30T10:00:00.000Z";

/** Footers show the answer's time; count them by that text. */
function footerCount(container: HTMLElement): number {
  return (container.textContent?.match(/ on \d{1,2} \w+ \d{4}/g) ?? []).length;
}

function renderMessages() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>
        <ChatMessages />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

function narratedAnswer() {
  const { addMessage } = useChatStore.getState();
  addMessage({ type: "user", message: "How much?", timestamp: TIMESTAMP });
  addMessage({
    type: "assistant",
    message: "Let me look.",
    timestamp: TIMESTAMP,
  });
  addMessage({ type: "assistant", message: "1.2 Mha.", timestamp: TIMESTAMP });
}

describe("ChatMessages and transient messages", () => {
  beforeEach(() => {
    queryClient.clear();
    useChatStore.getState().reset();
  });

  it("shows the footer on both parts of a narrated answer", async () => {
    narratedAnswer();
    const { container } = renderMessages();
    await waitFor(() => expect(footerCount(container)).toBe(2));
  });

  it("keeps the final part's footer when a transient card follows it", async () => {
    narratedAnswer();
    // As showProfilePrompt leaves it: the card's data settled in the cache.
    queryClient.setQueryData(profileOptionsQuery.queryKey, {
      sectors: {},
      sector_roles: {},
      countries: {},
      languages: {},
    });
    queryClient.setQueryData(profilePrefillQuery("").queryKey, {
      found: false,
    });
    useChatStore.getState().upsertProfilePrompt();
    const { container } = renderMessages();
    await waitFor(() => expect(footerCount(container)).toBe(2));
    // And the card is really there, under the answer.
    expect(container.textContent).toContain(
      "Help us tailor Global Nature Watch"
    );
  });
});
