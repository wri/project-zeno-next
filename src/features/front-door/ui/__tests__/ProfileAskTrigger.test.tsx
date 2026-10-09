// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getToken: () => "token",
}));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { act } from "react";
import { apiFetch } from "@/app/lib/api-client";
import { queryClient } from "@/app/lib/query-client";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import { ProfileAskTrigger } from "../ProfileAskTrigger";

function signIn(hasProfile: boolean) {
  useAuthStore.getState().setAuthStatus({
    email: "maria@example.org",
    id: "u-1",
    hasProfile,
    userType: null,
    termsAccepted: true,
  });
}

/** Simulates a finished live answer, as sendMessage signals it. */
async function answer() {
  await act(async () => {
    useChatStore.setState((s) => ({
      completedAnswers: s.completedAnswers + 1,
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const fetched = (path: string) =>
  vi.mocked(apiFetch).mock.calls.some(([p]) => p === path);

describe("ProfileAskTrigger", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockImplementation(async (path) =>
      path === "/api/profile/config"
        ? new Response(
            JSON.stringify({
              sectors: {},
              sector_roles: {},
              countries: {},
              languages: {},
            })
          )
        : new Response("", { status: 404 })
    );
    queryClient.clear();
    localStorage.clear();
    sessionStorage.clear();
    useChatStore.getState().reset();
    useAuthStore.getState().clearAuth();
  });

  it("does nothing for someone with a profile", async () => {
    signIn(true);
    render(<ProfileAskTrigger />);
    await answer();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it("asks after the first answer while an ask is possible", async () => {
    signIn(false);
    render(<ProfileAskTrigger />);
    await answer();
    await vi.waitFor(() => expect(fetched("/api/profile/config")).toBe(true));
    expect(localStorage.getItem("gnw_profile_ask_v2:u-1")).toContain(
      '"lifetimeAnswers":1'
    );
  });

  it("stops watching once the profile is complete", async () => {
    signIn(false);
    render(<ProfileAskTrigger />);
    act(() => signIn(true));
    await answer();
    expect(localStorage.length).toBe(0);
  });
});
