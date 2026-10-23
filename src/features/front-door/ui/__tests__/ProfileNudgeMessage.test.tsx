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
import useChatStore from "@/app/store/chatStore";
import { ProfileNudgeMessage } from "../ProfileNudgeMessage";

const nudges = () =>
  useChatStore.getState().messages.filter((m) => m.type === "profile-nudge");

function renderNudge() {
  useChatStore.getState().upsertProfileAsk("profile-nudge");
  return render(
    <ChakraProvider value={defaultSystem}>
      <ProfileNudgeMessage messageId={nudges()[0].id} />
    </ChakraProvider>
  );
}

function signIn(hasProfile: boolean) {
  useAuthStore.getState().setAuthStatus({
    email: "maria@example.org",
    id: "u-1",
    hasProfile,
    userType: null,
  });
}

describe("a profile-nudge message in the chat", () => {
  beforeEach(() => {
    localStorage.clear();
    useChatStore.getState().reset();
    signIn(false);
  });

  it("shows the banner", () => {
    renderNudge();
    expect(screen.getByRole("button", { name: "Add details" })).toBeDefined();
  });

  it("renders nothing once the profile is complete", () => {
    signIn(true);
    const { container } = renderNudge();
    expect(container.textContent).toBe("");
  });

  it("removes its message on Not now", () => {
    renderNudge();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(nudges()).toHaveLength(0);
  });
});
