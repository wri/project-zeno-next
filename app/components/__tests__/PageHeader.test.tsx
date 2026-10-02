// @vitest-environment happy-dom
/**
 * The slim header: menu button, logo with the PREVIEW badge, the Map and
 * Dashboards tabs, and the avatar. The active tab follows the route; state
 * items (prompt meter, What's new) sit left of the avatar.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";
import {
  WHATS_NEW_OPEN_EVENT,
  WHATS_NEW_STORAGE_KEY,
} from "@/app/hooks/useWhatsNew";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const router = vi.hoisted(() => ({ pathname: "/app" }));

vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => router.pathname,
}));

// The panel itself is out of scope; the header only asks for it to open.
vi.mock("../WhatsNewModal", () => ({ default: () => null }));

import PageHeader from "../PageHeader";

function renderHeader(pathname: string) {
  router.pathname = pathname;
  return render(
    <ChakraProvider value={system}>
      <PageHeader />
    </ChakraProvider>
  );
}

function precedes(a: Element, b: Element) {
  return Boolean(
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
  );
}

function activeTab() {
  return screen
    .getByRole("navigation", { name: "Main" })
    .querySelector("[aria-current='page']");
}

describe("PageHeader", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
  });

  it("shows the menu button, logo, PREVIEW badge, both tabs and the avatar", () => {
    renderHeader("/app");

    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Global Nature Watch Horizon" })
    ).toBeTruthy();
    expect(screen.getByText("PREVIEW")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Map" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Dashboards" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /account menu.*user@example.com/i })
    ).toBeTruthy();
  });

  it.each([
    ["the map", "/app", "Map"],
    ["a map thread", "/app/threads/t1", "Map"],
    ["the dashboards list", "/dashboards", "Dashboards"],
    ["a dashboard detail page", "/dashboards/d1", "Dashboards"],
  ])("marks %s as the %s tab", (_, pathname, label) => {
    renderHeader(pathname);
    expect(activeTab()?.textContent).toBe(label);
  });

  it("marks no tab active off the map and dashboards", () => {
    renderHeader("/dashboard");
    expect(activeTab()).toBeNull();
  });
});

describe("PageHeader What's new signal", () => {
  const headerIcon = () =>
    screen.queryByRole("button", { name: /what's new \(unread updates\)/i });
  const menuBadge = () => screen.queryByTestId("whats-new-menu-badge");

  async function openAccountMenu() {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    });
  }

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
  });

  it("shows the icon with its dot left of the avatar while updates are unread", async () => {
    renderHeader("/app");

    const icon = headerIcon();
    expect(icon).toBeTruthy();
    expect(screen.getByTestId("whats-new-header-dot")).toBeTruthy();
    const avatar = screen.getByRole("button", { name: /account menu/i });
    expect(precedes(icon!, avatar)).toBe(true);

    await openAccountMenu();
    expect(menuBadge()).toBeTruthy();
  });

  it("opens What's new and clears both signals when the icon is clicked", async () => {
    const onOpen = vi.fn();
    window.addEventListener(WHATS_NEW_OPEN_EVENT, onOpen);
    renderHeader("/app");

    await act(async () => {
      fireEvent.click(headerIcon()!);
    });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe("true");
    expect(headerIcon()).toBeNull();
    await openAccountMenu();
    expect(menuBadge()).toBeNull();
    window.removeEventListener(WHATS_NEW_OPEN_EVENT, onOpen);
  });

  it("hides the icon and the menu badge once everything is read", async () => {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, "true");
    renderHeader("/app");

    expect(headerIcon()).toBeNull();
    await openAccountMenu();
    expect(screen.getByRole("menuitem", { name: /what's new/i })).toBeTruthy();
    expect(menuBadge()).toBeNull();
  });
});

describe("PageHeader prompt meter", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
    useAuthStore.getState().setPromptUsage(0, 20);
  });

  it("leaves the meter out below 75% usage", () => {
    useAuthStore.getState().setPromptUsage(14, 20);
    renderHeader("/app");
    expect(screen.queryByTestId("prompt-quota-meter")).toBeNull();
  });

  it("orders meter, What's new, avatar when both states are true", () => {
    useAuthStore.getState().setPromptUsage(15, 20);
    renderHeader("/app");

    const meter = screen.getByTestId("prompt-quota-meter");
    const whatsNew = screen.getByRole("button", { name: /what's new/i });
    const avatar = screen.getByRole("button", { name: /user@example.com/ });

    // Unread updates: the What's new dot is showing.
    expect(screen.getByTestId("whats-new-header-dot")).toBeTruthy();
    expect(precedes(meter, whatsNew)).toBe(true);
    expect(precedes(whatsNew, avatar)).toBe(true);
  });
});
