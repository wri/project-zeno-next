// @vitest-environment happy-dom
/**
 * The chat panel's views: the history view swaps the messages for past
 * conversations and the prompt box for the "Available prompts" card, in both
 * panel sizes; picking a conversation returns to the chat; collapsing and
 * reopening the compact panel keeps the chat; on mobile, where the header with
 * those controls is hidden, the panel always shows the chat.
 */
import { ChakraProvider } from "@chakra-ui/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useSidebarStore from "@/app/store/sidebarStore";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => "/app/threads/t1",
  useRouter: () => ({ push: vi.fn() }),
}));

// The panel's own children are covered elsewhere; stand-ins keep this about
// which view the panel shows.
vi.mock("../components/ChatMessages", () => ({
  default: () => <div data-testid="chat-messages" />,
}));
vi.mock("../components/ChatInput", () => ({
  default: () => <div data-testid="chat-input" />,
}));
vi.mock("../components/ConversationHistoryList", () => ({
  default: ({ onThreadOpen }: { onThreadOpen?: () => void }) => (
    <button type="button" onClick={onThreadOpen}>
      KBAs in Brazil
    </button>
  ),
}));

import ChatPanel from "../ChatPanel";

function renderPanel() {
  return render(
    <ChakraProvider value={system}>
      <ChatPanel />
    </ChakraProvider>
  );
}

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

describe.each([
  ["compact", false],
  ["full-size", true],
])("ChatPanel history view (%s)", (_, isChatFullSize) => {
  beforeEach(() => {
    useSidebarStore.setState({
      isChatFullSize,
      isChatCollapsed: false,
      chatHistoryOpen: false,
    });
  });

  it("swaps the chat for past conversations and the prompts card", async () => {
    renderPanel();
    expect(screen.getByTestId("chat-messages")).toBeTruthy();
    expect(screen.getByTestId("chat-input")).toBeTruthy();

    await click(screen.getByRole("button", { name: "Conversation history" }));

    expect(screen.getByText("Conversation history")).toBeTruthy();
    expect(screen.getByTestId("available-prompts-card")).toBeTruthy();
    expect(screen.queryByTestId("chat-messages")).toBeNull();
    expect(screen.queryByTestId("chat-input")).toBeNull();
  });

  it("returns to the chat once a conversation is picked", async () => {
    useSidebarStore.setState({ chatHistoryOpen: true });
    renderPanel();

    await click(screen.getByRole("button", { name: "KBAs in Brazil" }));

    expect(useSidebarStore.getState().chatHistoryOpen).toBe(false);
    expect(screen.getByTestId("chat-messages")).toBeTruthy();
    expect(screen.getByTestId("chat-input")).toBeTruthy();
  });
});

describe("ChatPanel collapse", () => {
  beforeEach(() => {
    useSidebarStore.setState({
      isChatFullSize: false,
      isChatCollapsed: false,
      chatHistoryOpen: false,
    });
  });

  it("shrinks to the header bar and reopens with the chat", async () => {
    renderPanel();

    await click(screen.getByRole("button", { name: "Collapse panel" }));
    await waitFor(() =>
      expect(screen.queryByTestId("chat-messages")).toBeNull()
    );
    expect(screen.getByTestId("chat-panel-header")).toBeTruthy();

    await click(screen.getByTestId("chat-panel-header"));
    expect(await screen.findByTestId("chat-messages")).toBeTruthy();
  });
});

// happy-dom's viewport control, which drives the breakpoint media queries.
const setViewportWidth = (width: number) =>
  (
    window as unknown as {
      happyDOM: { setViewport: (v: { width: number }) => void };
    }
  ).happyDOM.setViewport({ width });

describe("ChatPanel on mobile", () => {
  const desktopWidth = window.innerWidth;

  beforeEach(() => {
    useSidebarStore.setState({
      isChatFullSize: false,
      isChatCollapsed: true,
      chatHistoryOpen: true,
    });
  });

  afterEach(() => {
    setViewportWidth(desktopWidth);
  });

  it("drops a history view or collapse left open on desktop", async () => {
    setViewportWidth(375);
    renderPanel();

    await waitFor(() =>
      expect(useSidebarStore.getState().chatHistoryOpen).toBe(false)
    );
    expect(useSidebarStore.getState().isChatCollapsed).toBe(false);
    expect(await screen.findByTestId("chat-messages")).toBeTruthy();
    expect(screen.getByTestId("chat-input")).toBeTruthy();
  });

  it("keeps them on desktop", () => {
    renderPanel();
    expect(useSidebarStore.getState().chatHistoryOpen).toBe(true);
    expect(useSidebarStore.getState().isChatCollapsed).toBe(true);
  });
});
