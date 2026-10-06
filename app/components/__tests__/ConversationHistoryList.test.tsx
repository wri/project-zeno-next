// @vitest-environment happy-dom
/**
 * The conversation history list shared by the chat panel's history view and
 * the mobile drawer: grouped past chats, opening one where the chat lives
 * (navigate on the map, load in place on a dashboard), and the "..." menu's
 * rename and delete.
 */
import { ChakraProvider } from "@chakra-ui/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";
import type { ThreadEntry } from "@/app/hooks/useThreadsInfinite";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const router = vi.hoisted(() => ({
  pathname: "/app",
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => router.pathname,
  useRouter: () => ({ push: router.push, replace: router.replace }),
}));

function thread(id: string, name: string): ThreadEntry {
  return {
    agent_id: "UniGuana",
    created_at: "2026-10-02T09:00:00Z",
    updated_at: "2026-10-02T09:00:00Z",
    id,
    name,
    user_id: "u1",
    is_public: false,
  };
}

const threadGroups = {
  today: [thread("t1", "KBAs in Brazil")],
  previousWeek: [thread("t2", "Past conversation")],
  older: [],
};

vi.mock("@/app/hooks/useThreadsInfinite", () => ({
  useThreadsInfinite: () => ({
    threadGroups,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

vi.mock("@/app/hooks/useIntersectionObserver", () => ({
  useIntersectionObserver: () => {},
}));

import ConversationHistoryList from "../ConversationHistoryList";

const onThreadOpen = vi.fn();

function renderList(pathname: string) {
  router.pathname = pathname;
  return render(
    <ChakraProvider value={system}>
      <ConversationHistoryList onThreadOpen={onThreadOpen} />
    </ChakraProvider>
  );
}

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

// The menu's positioner has no layout in happy-dom, so role queries treat
// its items as hidden; find them inside the open menu by text instead.
function menuItem(label: string) {
  const menu = document.querySelector("[role='menu'][data-state='open']");
  const item = Array.from(
    menu?.querySelectorAll("[role='menuitem']") ?? []
  ).find((el) => el.textContent === label);
  if (!item) throw new Error(`No "${label}" item in the open menu`);
  return item;
}

// The menu selects its highlighted item, so hover the item before clicking.
async function select(item: Element) {
  await act(async () => {
    fireEvent.pointerMove(item, { pointerType: "mouse" });
  });
  await act(async () => {
    fireEvent.click(item);
  });
}

async function openActions(name: string) {
  await click(
    screen.getByRole("button", { name: `Thread actions for ${name}` })
  );
}

describe("ConversationHistoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({ currentThreadId: null });
  });

  it("groups past chats under Today and Previous 7 days", () => {
    renderList("/app");

    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Previous 7 days")).toBeTruthy();
    expect(screen.getByText("KBAs in Brazil")).toBeTruthy();
    expect(screen.getByText("Past conversation")).toBeTruthy();
  });

  it("opens a chat on the map by linking to its thread", async () => {
    renderList("/app");

    const link = screen.getByRole("link", { name: "KBAs in Brazil" });
    expect(link.getAttribute("href")).toBe("/app/threads/t1");

    await click(link);
    expect(onThreadOpen).toHaveBeenCalledTimes(1);
  });

  it("loads a chat in place on a dashboard", async () => {
    const fetchThread = vi
      .spyOn(useChatStore.getState(), "fetchThread")
      .mockResolvedValue(undefined);
    renderList("/dashboards/d1");

    await click(screen.getByRole("button", { name: "KBAs in Brazil" }));

    expect(fetchThread).toHaveBeenCalledWith("t1");
    expect(onThreadOpen).toHaveBeenCalledTimes(1);
  });

  it("renames a chat from its menu", async () => {
    const renameThread = vi
      .spyOn(useSidebarStore.getState(), "renameThread")
      .mockResolvedValue(undefined);
    renderList("/app");

    await openActions("KBAs in Brazil");
    await select(menuItem("Rename"));
    const input = await screen.findByDisplayValue("KBAs in Brazil");
    fireEvent.change(input, { target: { value: "Brazil KBAs" } });
    await click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(renameThread).toHaveBeenCalledWith("t1", "Brazil KBAs")
    );
  });

  it("deletes a chat from its menu", async () => {
    const deleteThread = vi
      .spyOn(useSidebarStore.getState(), "deleteThread")
      .mockResolvedValue(undefined);
    renderList("/app");

    await openActions("KBAs in Brazil");
    await select(menuItem("Delete"));
    await click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteThread).toHaveBeenCalledWith("t1"));
  });
});
