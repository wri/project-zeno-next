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
    useChatStore.setState({ sendMessage: sendSpy });
    useSidebarStore.setState({ chatInputFocusToken: 0 });
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

  it("hides 'Text block' for a viewer who doesn't own the dashboard", () => {
    renderModules(false);

    expect(screen.queryByRole("button", { name: "Text block" })).toBeNull();
  });

  it("requests chat input focus on 'Describe your own'", () => {
    renderModules(true);

    fireEvent.click(screen.getByRole("button", { name: "Describe your own" }));

    expect(useSidebarStore.getState().chatInputFocusToken).toBe(1);
  });
});
