// @vitest-environment happy-dom
/**
 * The menu side bar: every destination that isn't a main tab (Map,
 * Dashboards, My areas; Help, What's new, User settings), the prompt
 * allowance and the email with sign out. Picking an item, Esc and a click
 * outside close it; the current destination shows as active.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useSidebarStore from "@/app/store/sidebarStore";
import {
  WHATS_NEW_OPEN_EVENT,
  WHATS_NEW_STORAGE_KEY,
} from "@/app/hooks/useWhatsNew";
import { WHATS_NEW_FEATURES } from "../whatsNewFeatures";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const router = vi.hoisted(() => ({ pathname: "/app", push: vi.fn() }));

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  // React Router's Link needs a router; a plain anchor is enough here.
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
  usePathname: () => router.pathname,
  useRouter: () => ({ push: router.push }),
}));

const logout = vi.hoisted(() => vi.fn());
vi.mock("@/app/hooks/useLogout", () => ({
  useLogout: () => ({ logout, isLoggingOut: false }),
}));

import MenuSideBar from "../MenuSideBar";

function renderMenu(pathname = "/app") {
  router.pathname = pathname;
  return render(
    <ChakraProvider value={system}>
      <MenuSideBar />
    </ChakraProvider>
  );
}

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

const item = (name: string) =>
  screen.getByRole("link", { name }) as HTMLElement;
const action = (name: RegExp) => screen.getByRole("button", { name });
const activeItem = () =>
  screen
    .getByRole("navigation", { name: "Destinations" })
    .querySelector("[aria-current='page']");

describe("MenuSideBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useChatStore.setState({ currentThreadId: null });
    useSidebarStore.setState({
      menuOpen: true,
      areasPanelOpen: false,
      areasPanelFilter: "boundaries",
    });
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
    useAuthStore.getState().setPromptUsage(10, 20);
  });

  it("lists the destinations, the prompts card and the email with sign out", () => {
    renderMenu();

    const nav = screen.getByRole("navigation", { name: "Destinations" });
    const labels = Array.from(nav.querySelectorAll("a, button")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual([
      "Map",
      "Dashboards",
      "My areas",
      "Help",
      expect.stringMatching(/^What's new/),
      "User settings",
    ]);
    expect(screen.getByText("10 / 20 daily prompts")).toBeTruthy();
    expect(screen.getByText("user@example.com")).toBeTruthy();
    expect(action(/sign out/i)).toBeTruthy();
  });

  it("sends each item where it goes today", () => {
    useChatStore.setState({ currentThreadId: "t1" });
    renderMenu("/dashboards");

    expect(item("Map").getAttribute("href")).toBe("/app/threads/t1");
    expect(item("Dashboards").getAttribute("href")).toBe("/dashboards");
    expect(item("User settings").getAttribute("href")).toBe("/dashboard");
    const help = item("Help");
    expect(help.getAttribute("href")).toBe(
      "https://help.horizon.globalnaturewatch.org/"
    );
    expect(help.getAttribute("target")).toBe("_blank");
  });

  it("closes when a destination is picked", async () => {
    renderMenu();
    await click(item("Dashboards"));
    expect(useSidebarStore.getState().menuOpen).toBe(false);
  });

  it("closes on Esc", async () => {
    renderMenu();
    // The dismiss layer registers after a frame and listens on the document.
    await act(() => new Promise((r) => setTimeout(r, 50)));
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(useSidebarStore.getState().menuOpen).toBe(false);
  });

  it("closes on a click outside", async () => {
    renderMenu();
    await act(() => new Promise((r) => setTimeout(r, 50)));
    await act(async () => {
      fireEvent.pointerDown(document.body, { pointerType: "mouse" });
    });
    expect(useSidebarStore.getState().menuOpen).toBe(false);
  });

  it.each([
    ["/app", "Map"],
    ["/app/threads/t1", "Map"],
    ["/dashboards/d1", "Dashboards"],
    ["/dashboard", "User settings"],
  ])("marks the item for %s as active", (pathname, label) => {
    renderMenu(pathname);
    expect(activeItem()?.textContent).toBe(label);
  });

  it("marks My areas active while its tab is open on the map", () => {
    useSidebarStore.setState({
      areasPanelOpen: true,
      areasPanelFilter: "mine",
    });
    renderMenu("/app");
    expect(activeItem()?.textContent).toBe("My areas");
  });

  it("opens the Areas panel on My areas in place on the map", async () => {
    renderMenu("/app/threads/t1");

    await click(action(/my areas/i));

    const state = useSidebarStore.getState();
    expect(state.areasPanelOpen).toBe(true);
    expect(state.areasPanelFilter).toBe("mine");
    expect(state.menuOpen).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("leaves My areas for the map by closing the Areas panel", async () => {
    useSidebarStore.setState({
      areasPanelOpen: true,
      areasPanelFilter: "mine",
    });
    renderMenu("/app/threads/t1");

    await click(item("Map"));

    expect(useSidebarStore.getState().areasPanelOpen).toBe(false);
    expect(useSidebarStore.getState().menuOpen).toBe(false);
  });

  it("leaves other Areas tabs open when Map is picked", async () => {
    useSidebarStore.setState({
      areasPanelOpen: true,
      areasPanelFilter: "boundaries",
    });
    renderMenu("/app/threads/t1");

    await click(item("Map"));

    expect(useSidebarStore.getState().areasPanelOpen).toBe(true);
  });

  it("goes to the map for My areas from elsewhere, keeping the thread", async () => {
    useChatStore.setState({ currentThreadId: "t1" });
    renderMenu("/dashboards/d1");

    await click(action(/my areas/i));

    expect(router.push).toHaveBeenCalledWith("/app/threads/t1");
    expect(useSidebarStore.getState().areasPanelFilter).toBe("mine");
  });

  it("badges What's new with the update count while unread and opens it", async () => {
    const onOpen = vi.fn();
    window.addEventListener(WHATS_NEW_OPEN_EVENT, onOpen);
    renderMenu();

    const whatsNew = action(/what's new/i);
    expect(whatsNew.textContent).toContain(
      `${WHATS_NEW_FEATURES.length} items`
    );

    await click(whatsNew);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(useSidebarStore.getState().menuOpen).toBe(false);
    window.removeEventListener(WHATS_NEW_OPEN_EVENT, onOpen);
  });

  it("drops the What's new badge once read", () => {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, "true");
    renderMenu();
    expect(action(/what's new/i).textContent).toBe("What's new");
  });

  it("signs out", async () => {
    renderMenu();
    await click(action(/sign out/i));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
