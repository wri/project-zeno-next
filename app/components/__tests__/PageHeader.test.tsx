// @vitest-environment happy-dom
/**
 * The slim header: menu button (opens the menu side bar), logo with the
 * PREVIEW badge, the Map and Dashboards tabs, and the avatar (User Profile
 * and Logout, email on hover). The active tab follows the route; state items
 * (prompt meter, What's new) sit left of the avatar.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";
import useSidebarStore from "@/app/store/sidebarStore";
import { i18n } from "@/src/shared/lib/i18n";
import {
  WHATS_NEW_OPEN_EVENT,
  WHATS_NEW_STORAGE_KEY,
} from "@/app/hooks/useWhatsNew";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

const router = vi.hoisted(() => ({ pathname: "/app" }));

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  // React Router's Link needs a router; a plain anchor is enough here.
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
  usePathname: () => router.pathname,
  useRouter: () => ({ push: vi.fn() }),
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
    useSidebarStore.setState({ menuOpen: false });
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
    expect(screen.getByRole("button", { name: "Account menu" })).toBeTruthy();
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

  it("opens the menu side bar from the menu button", async () => {
    renderHeader("/app");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    });

    expect(useSidebarStore.getState().menuOpen).toBe(true);
    expect(
      screen.getByRole("navigation", { name: "Destinations" })
    ).toBeTruthy();
  });
});

describe("PageHeader account menu", () => {
  const avatar = () => screen.getByRole("button", { name: /account menu/i });

  beforeEach(() => {
    localStorage.clear();
    useSidebarStore.setState({ menuOpen: false });
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
  });

  it("shows the user's email in a tooltip on hover over the avatar", async () => {
    renderHeader("/app");

    fireEvent.pointerMove(avatar(), { pointerType: "mouse" });

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("user@example.com");
  });

  it("keeps the user's email out of the avatar's accessible name", () => {
    // GTM click triggers read aria-label; personal data must not reach GA4.
    renderHeader("/app");

    expect(avatar().getAttribute("aria-label")).toBe("Account menu");
  });

  it("lists only User Profile and Logout, without repeating the email", async () => {
    renderHeader("/app");

    await act(async () => {
      fireEvent.click(avatar());
    });

    const items = screen
      .getAllByRole("menuitem")
      .map((el) => el.textContent?.trim());
    expect(items).toEqual(["User Profile", "Logout"]);
    expect(screen.getByRole("menu").textContent).not.toContain(
      "user@example.com"
    );
  });

  describe("with ?ff=email-subscriptions", () => {
    const menuLabels = () =>
      screen.getAllByRole("menuitem").map((el) => el.textContent?.trim());

    async function openMenu() {
      await act(async () => {
        fireEvent.click(avatar());
      });
    }

    beforeEach(() => {
      window.history.replaceState({}, "", "/?ff=email-subscriptions");
    });

    afterEach(() => {
      window.history.replaceState({}, "", "/");
    });

    it("shows who is signed in, then Alert subscriptions, User settings and Log out", async () => {
      renderHeader("/app");
      await openMenu();

      expect(menuLabels()).toEqual([
        "Alert subscriptions",
        "User settings",
        "Log out",
      ]);
      const menu = screen.getByRole("menu");
      expect(menu.textContent).toContain("Signed in as");
      expect(menu.textContent).toContain("user@example.com");
      expect(
        screen
          .getByRole("menuitem", { name: "Alert subscriptions" })
          .getAttribute("href")
      ).toBe("/subscriptions?ff=email-subscriptions");
    });

    it("keeps the Complete your profile reminder in the settings slot", async () => {
      useAuthStore.getState().setAuthStatus({
        email: "user@example.com",
        id: "u1",
        hasProfile: false,
        userType: null,
      });
      renderHeader("/app");
      await openMenu();

      expect(menuLabels()).toEqual([
        "Alert subscriptions",
        "Complete your profile",
        "Log out",
      ]);
    });

    it("drops the hover tooltip and keeps the email out of every aria-label", async () => {
      renderHeader("/app");
      fireEvent.pointerMove(avatar(), { pointerType: "mouse" });
      await act(() => new Promise((r) => setTimeout(r, 50)));
      expect(screen.queryByRole("tooltip")).toBeNull();

      await openMenu();
      expect(avatar().getAttribute("aria-label")).toBe("Account menu");
      const labelled = document.body.querySelectorAll("[aria-label]");
      for (const el of labelled) {
        expect(el.getAttribute("aria-label")).not.toContain("user@example.com");
      }
    });

    it("closes on Escape and returns focus to the avatar", async () => {
      renderHeader("/app");
      avatar().focus();
      await act(async () => {
        fireEvent.keyDown(avatar(), { key: "Enter" });
      });
      expect(await screen.findByRole("menu")).toBeTruthy();

      await act(async () => {
        fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
      });
      await act(() => new Promise((r) => setTimeout(r, 50)));

      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(avatar());
    });

    it("closes on a click outside", async () => {
      renderHeader("/app");
      await openMenu();
      await act(async () => {
        fireEvent.pointerDown(document.body, { pointerType: "mouse" });
      });
      await act(() => new Promise((r) => setTimeout(r, 50)));

      expect(screen.queryByRole("menu")).toBeNull();
    });
  });
});

describe("PageHeader What's new signal", () => {
  const headerIcon = () =>
    screen.queryByRole("button", { name: /what's new \(unread updates\)/i });
  // The menu side bar's What's new item carries the unread count badge.
  const sideBarItem = () =>
    screen.getByRole("button", { name: /^what's new/i });

  async function openMenu() {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    });
  }

  beforeEach(() => {
    localStorage.clear();
    useSidebarStore.setState({ menuOpen: false });
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

    await openMenu();
    expect(sideBarItem().textContent).toMatch(/\d+ items/);
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
    await openMenu();
    expect(sideBarItem().textContent).toBe("What's new");
    window.removeEventListener(WHATS_NEW_OPEN_EVENT, onOpen);
  });

  it("hides the icon and the side bar badge once everything is read", async () => {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, "true");
    renderHeader("/app");

    expect(headerIcon()).toBeNull();
    await openMenu();
    expect(sideBarItem().textContent).toBe("What's new");
  });
});

describe("PageHeader prompt meter", () => {
  beforeEach(() => {
    localStorage.clear();
    useSidebarStore.setState({ menuOpen: false });
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
    const avatar = screen.getByRole("button", { name: "Account menu" });

    // Unread updates: the What's new dot is showing.
    expect(screen.getByTestId("whats-new-header-dot")).toBeTruthy();
    expect(precedes(meter, whatsNew)).toBe(true);
    expect(precedes(whatsNew, avatar)).toBe(true);
  });
});

describe("PageHeader profile reminder (front door)", () => {
  function signIn(hasProfile: boolean) {
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile,
      userType: null,
    });
  }

  /** Opens the account menu; resolves with its items' labels. */
  async function openAccountMenu() {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    });
    const items = await screen.findAllByRole("menuitem");
    return items.map((el) => el.textContent?.trim());
  }
  const menuItem = () =>
    screen.queryByRole("menuitem", { name: /complete your profile/i });
  const dot = () => screen.queryByRole("img", { name: "Profile not complete" });

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setPromptUsage(0, 20);
  });

  it("replaces User Profile, linking to the same page, and marks the account button while the profile is incomplete", async () => {
    signIn(false);
    renderHeader("/app");
    expect(dot()).not.toBeNull();

    expect(await openAccountMenu()).toEqual([
      "Complete your profile",
      "Logout",
    ]);
    expect(menuItem()!.getAttribute("href")).toBe("/dashboard");
  });

  it("gives way to User Profile once the profile is complete", async () => {
    signIn(true);
    renderHeader("/app");
    expect(dot()).toBeNull();
    expect(await openAccountMenu()).toEqual(["User Profile", "Logout"]);
  });
});

describe("PageHeader locale", () => {
  beforeEach(() => {
    localStorage.clear();
    useSidebarStore.setState({ menuOpen: false });
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
    useAuthStore.getState().setPromptUsage(15, 20);
  });

  it("renders the header, preview info and prompt meter in the active locale", async () => {
    localStorage.setItem("gnw_disclaimer_dismissed_v2", "true");
    await act(() => i18n.changeLanguage("es"));
    try {
      renderHeader("/app");

      expect(screen.getByRole("button", { name: "Abrir menú" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Mapa" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Tableros" })).toBeTruthy();
      expect(screen.getByText("VISTA PREVIA")).toBeTruthy();
      expect(screen.getByText("15 / 20 consultas diarias")).toBeTruthy();
      expect(
        screen.getByRole("button", {
          name: "Novedades (actualizaciones sin leer)",
        })
      ).toBeTruthy();

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", {
            name: "Abrir información de la vista previa",
          })
        );
      });
      expect(screen.getByText("Versión preliminar")).toBeTruthy();
      expect(screen.getByRole("link", { name: "aquí" })).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Centro de ayuda" })
      ).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Preguntas frecuentes" })
      ).toBeTruthy();
      expect(screen.getByRole("link", { name: "Capacidades" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Precisión" })).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Problemas conocidos" })
      ).toBeTruthy();

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Menú de la cuenta" })
        );
      });
      expect(
        screen.getByRole("menuitem", { name: "Perfil de usuario" })
      ).toBeTruthy();
      expect(
        screen.getByRole("menuitem", { name: "Cerrar sesión" })
      ).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage("en"));
    }
  });
});
