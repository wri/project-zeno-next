// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The chatStore import chain reaches the Chakra toaster (.tsx) — stub it so the
// test environment can parse the module boundary.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../../api/dashboards", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  addTextWidget: vi.fn().mockResolvedValue(undefined),
}));

import { addTextWidget } from "../../api/dashboards";
import { toaster } from "@/app/components/ui/toaster";
import { SUGGESTED_PROMPT_MODULES } from "../../lib/suggested-modules";
import DashboardSuggestedModules from "../DashboardSuggestedModules";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";

const sendSpy = vi.fn().mockResolvedValue({ isNew: false, id: "t1" });

const renderModules = (isOwner: boolean) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <DashboardSuggestedModules dashboardId="d1" isOwner={isOwner} />
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe("DashboardSuggestedModules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({ sendMessage: sendSpy, isLoading: false });
    useSidebarStore.setState({ chatInputFocusToken: 0 });
    useAuthStore.setState({ usedPrompts: 0, totalPrompts: 10 });
  });

  it("sends each prompt card's canned prompt as a chat message", () => {
    renderModules(true);

    for (const card of SUGGESTED_PROMPT_MODULES) {
      fireEvent.click(screen.getByRole("button", { name: card.label }));
    }

    expect(sendSpy).toHaveBeenCalledTimes(SUGGESTED_PROMPT_MODULES.length);
    for (const card of SUGGESTED_PROMPT_MODULES) {
      expect(sendSpy).toHaveBeenCalledWith(card.prompt);
    }
  });

  it("adds a blank text widget on 'Text block' for the owner", async () => {
    renderModules(true);

    fireEvent.click(screen.getByRole("button", { name: "Text block" }));

    await waitFor(() => expect(addTextWidget).toHaveBeenCalledWith("d1"));
  });

  it("surfaces an error toast when adding the text widget fails", async () => {
    vi.mocked(addTextWidget).mockRejectedValueOnce(
      new Error("config.text: field required")
    );
    renderModules(true);

    fireEvent.click(screen.getByRole("button", { name: "Text block" }));

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't add text block",
          description: "config.text: field required",
          type: "error",
        })
      )
    );
  });

  it("renders nothing for a viewer who doesn't own the dashboard", () => {
    renderModules(false);

    // Every card writes to the dashboard — the prompts all ask the agent to
    // add the result to it — so a viewer gets no row at all, not just the
    // "Text block" card hidden.
    expect(screen.queryByText("Suggested modules")).toBeNull();
    expect(screen.queryByRole("button", { name: "Text block" })).toBeNull();
    for (const card of SUGGESTED_PROMPT_MODULES) {
      expect(screen.queryByRole("button", { name: card.label })).toBeNull();
    }
  });

  it("won't send a prompt while a chat turn is still streaming", () => {
    useChatStore.setState({ isLoading: true });
    renderModules(true);

    for (const card of SUGGESTED_PROMPT_MODULES) {
      fireEvent.click(screen.getByRole("button", { name: card.label }));
    }
    fireEvent.click(
      screen.getByRole("button", { name: "Describe your own via the chat" })
    );

    // A concurrent send clears the in-flight turn's tool steps and overwrites
    // its abort controller, orphaning the running request.
    expect(sendSpy).not.toHaveBeenCalled();
    expect(useSidebarStore.getState().chatInputFocusToken).toBe(0);
    expect(
      screen
        .getByRole("button", { name: SUGGESTED_PROMPT_MODULES[0].label })
        .getAttribute("aria-disabled")
    ).toBe("true");
  });

  it("won't send a prompt once the prompt quota is spent", () => {
    useAuthStore.setState({ usedPrompts: 10, totalPrompts: 10 });
    renderModules(true);

    fireEvent.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPT_MODULES[0].label })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Describe your own via the chat" })
    );

    expect(sendSpy).not.toHaveBeenCalled();
    expect(useSidebarStore.getState().chatInputFocusToken).toBe(0);
  });

  it("still allows adding a text block while a chat turn streams", () => {
    // The note is a direct POST, not a chat round-trip, so the chat gates
    // don't apply to it.
    useChatStore.setState({ isLoading: true });
    renderModules(true);

    fireEvent.click(screen.getByRole("button", { name: "Text block" }));

    return waitFor(() => expect(addTextWidget).toHaveBeenCalledWith("d1"));
  });

  it("requests chat input focus on 'Describe your own via the chat'", () => {
    renderModules(true);

    fireEvent.click(
      screen.getByRole("button", { name: "Describe your own via the chat" })
    );

    expect(useSidebarStore.getState().chatInputFocusToken).toBe(1);
  });
});
