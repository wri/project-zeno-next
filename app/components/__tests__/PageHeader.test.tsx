// @vitest-environment happy-dom
/**
 * Right-hand header cluster: the prompt meter only joins it at 75% usage, and
 * when it does it leads, ahead of What's new and the user avatar.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => "/app",
}));

vi.mock("@/app/hooks/useThreadsInfinite", () => ({
  useThreadsInfinite: () => ({ threads: [] }),
}));

import PageHeader from "../PageHeader";

function renderHeader() {
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
    renderHeader();
    expect(screen.queryByTestId("prompt-quota-meter")).toBeNull();
  });

  it("orders meter, What's new, avatar when both states are true", () => {
    useAuthStore.getState().setPromptUsage(15, 20);
    renderHeader();

    const meter = screen.getByTestId("prompt-quota-meter");
    const whatsNew = screen.getByRole("button", { name: /what's new/i });
    const avatar = screen.getByRole("button", { name: /user@example.com/ });

    // Unread updates: the What's new dot is showing.
    expect(whatsNew.querySelector("div")).toBeTruthy();
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

  /** Opens the account menu; resolves once its User Profile item is showing. */
  async function openAccountMenu() {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /user@example.com/ }));
    });
    return screen.findByRole("menuitem", { name: /user profile/i });
  }
  const menuItem = () =>
    screen.queryByRole("menuitem", { name: /complete your profile/i });
  const dot = () => screen.queryByRole("img", { name: "Profile not complete" });

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setPromptUsage(0, 20);
  });

  it("links to the settings page and marks the account button while the profile is incomplete", async () => {
    signIn(false);
    renderHeader();
    expect(dot()).not.toBeNull();

    const settings = await openAccountMenu();
    const item = menuItem();
    expect(item).not.toBeNull();
    expect(item!.getAttribute("href")).toBe("/dashboard");
    expect(precedes(item!, settings)).toBe(true);
  });

  it("goes away once the profile is complete", async () => {
    signIn(true);
    renderHeader();
    expect(dot()).toBeNull();
    await openAccountMenu();
    expect(menuItem()).toBeNull();
  });
});
