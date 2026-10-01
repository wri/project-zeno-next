// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getToken: () => "token",
}));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import useAuthStore from "@/app/store/authStore";
import useProfileNudgeStore from "../../model/profile-nudge-store";
import { ProfileNudgeSlot } from "../ProfileNudgeSlot";

function renderSlot() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <ProfileNudgeSlot pb={2} />
    </ChakraProvider>
  );
}

describe("ProfileNudgeSlot", () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileNudgeStore.getState().closeBanner();
    useAuthStore.getState().setAuthStatus({
      email: "maria@example.org",
      id: "u-1",
      hasProfile: false,
      userType: null,
    });
  });

  it("renders nothing until the ask policy opens the banner", () => {
    const { container } = renderSlot();
    expect(container.textContent).toBe("");
  });

  it("shows the banner once opened", () => {
    useProfileNudgeStore.getState().openBanner();
    renderSlot();
    expect(screen.getByRole("button", { name: "Add details" })).toBeDefined();
  });

  it("hides it once the profile is complete", () => {
    useProfileNudgeStore.getState().openBanner();
    useAuthStore.getState().setAuthStatus({
      email: "maria@example.org",
      id: "u-1",
      hasProfile: true,
      userType: null,
    });
    const { container } = renderSlot();
    expect(container.textContent).toBe("");
  });

  it("closing it counts a dismissal", () => {
    useProfileNudgeStore.getState().openBanner();
    renderSlot();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(useProfileNudgeStore.getState().bannerOpen).toBe(false);
    expect(
      JSON.parse(localStorage.getItem("gnw_profile_ask_v1:u-1")!)
    ).toMatchObject({ dismissals: 1 });
  });
});
