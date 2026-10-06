// @vitest-environment happy-dom
/**
 * The chat panel header: "AI ASSISTANT" and four controls in order (New
 * conversation, Conversation history, size toggle, Collapse), each with a
 * tooltip. Collapse from full-size lands on the collapsed compact panel, and
 * a collapsed panel reopens from a click on its bar.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const router = vi.hoisted(() => ({ pathname: "/app", push: vi.fn() }));

vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => router.pathname,
  useRouter: () => ({ push: router.push }),
}));

import ChatPanelHeader from "../ChatPanelHeader";

const onToggleSize = vi.fn();

function renderHeader({
  pathname = "/app",
  isFullSize = false,
}: { pathname?: string; isFullSize?: boolean } = {}) {
  router.pathname = pathname;
  return render(
    <ChakraProvider value={system}>
      <ChatPanelHeader isFullSize={isFullSize} onToggleSize={onToggleSize} />
    </ChakraProvider>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

describe("ChatPanelHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSidebarStore.setState({
      isChatFullSize: false,
      isChatCollapsed: false,
      chatHistoryOpen: false,
    });
  });

  it("shows AI ASSISTANT and the four controls in order", () => {
    renderHeader();

    expect(screen.getByText("AI Assistant")).toBeTruthy();
    const labels = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual([
      "New conversation",
      "Conversation history",
      "Switch to full-size view",
      "Collapse panel",
    ]);
  });

  it.each([
    "New conversation",
    "Conversation history",
    "Switch to full-size view",
    "Collapse panel",
  ])("shows a tooltip naming %s on hover", async (label) => {
    renderHeader();

    fireEvent.pointerMove(button(label), { pointerType: "mouse" });

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe(label);
  });

  it("starts a new conversation on the map by navigating to /app", async () => {
    useSidebarStore.setState({ chatHistoryOpen: true });
    renderHeader({ pathname: "/app/threads/t1" });

    await click(button("New conversation"));

    expect(router.push).toHaveBeenCalledWith("/app");
    expect(useSidebarStore.getState().chatHistoryOpen).toBe(false);
  });

  it("starts a new conversation on a dashboard in place", async () => {
    const resetChat = vi.spyOn(useChatStore.getState(), "reset");
    const resetMap = vi.spyOn(useMapStore.getState(), "reset");
    renderHeader({ pathname: "/dashboards/d1" });

    await click(button("New conversation"));

    expect(router.push).not.toHaveBeenCalled();
    expect(resetChat).toHaveBeenCalled();
    expect(resetMap).toHaveBeenCalled();
  });

  it("toggles the history view and marks its icon active", async () => {
    renderHeader();
    const history = button("Conversation history");
    expect(history.getAttribute("aria-pressed")).toBe("false");

    await click(history);
    expect(useSidebarStore.getState().chatHistoryOpen).toBe(true);
    expect(history.getAttribute("aria-pressed")).toBe("true");

    await click(history);
    expect(useSidebarStore.getState().chatHistoryOpen).toBe(false);
  });

  it("calls the size toggle", async () => {
    renderHeader();
    await click(button("Switch to full-size view"));
    expect(onToggleSize).toHaveBeenCalledTimes(1);
  });

  it("collapses the compact panel and reopens it from a click on its bar", async () => {
    renderHeader();

    await click(button("Collapse panel"));
    expect(useSidebarStore.getState().isChatCollapsed).toBe(true);
    expect(button("Expand panel")).toBeTruthy();

    await click(screen.getByText("AI Assistant"));
    expect(useSidebarStore.getState().isChatCollapsed).toBe(false);
  });

  it("collapses from full-size onto the collapsed compact panel", async () => {
    useSidebarStore.setState({ isChatFullSize: true });
    renderHeader({ isFullSize: true });

    await click(button("Collapse panel"));

    const state = useSidebarStore.getState();
    expect(state.isChatFullSize).toBe(false);
    expect(state.isChatCollapsed).toBe(true);
  });
});
