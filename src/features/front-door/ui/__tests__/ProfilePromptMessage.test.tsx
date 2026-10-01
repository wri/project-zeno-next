// @vitest-environment happy-dom
import { ChakraProvider } from "@chakra-ui/react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getToken: () => "token",
}));
vi.mock("@/app/hooks/useErrorHandler", () => ({
  showApiError: vi.fn(),
  showError: vi.fn(),
  showServiceUnavailableError: vi.fn(),
}));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));
vi.mock("@/app/lib/ortto", () => ({ submitOrttoProfile: vi.fn() }));

import system from "@/app/theme";
import MessageBubble from "@/app/components/MessageBubble";
import { apiFetch } from "@/app/lib/api-client";
import { showApiError } from "@/app/hooks/useErrorHandler";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/app/lib/query-client";
import { profileOptionsQuery, profilePrefillQuery } from "../../api/queries";
import type { ProfilePrefill } from "../../api/profile-prefill";

const OPTIONS = {
  sectors: { government: "Government" },
  sector_roles: { government: { analyst: "Analyst" } },
  countries: { BR: "Brazil" },
  languages: { pt: "Português" },
};

const GFW: ProfilePrefill = {
  found: true,
  suggestion: {
    source: "gfw",
    sector: "government",
    role: "analyst",
    country: "BR",
  },
};

/** Adds the card the way showProfilePrompt does: data in the cache first. */
function addCard(prefill: ProfilePrefill = GFW) {
  queryClient.setQueryData(profileOptionsQuery.queryKey, OPTIONS);
  queryClient.setQueryData(profilePrefillQuery("u-1").queryKey, prefill);
  useChatStore.getState().upsertProfilePrompt();
  return useChatStore.getState().messages.at(-1)!;
}

function renderBubble(id: string) {
  const message = useChatStore.getState().messages.find((m) => m.id === id)!;
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>
        <MessageBubble message={message} isLast />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

describe("a profile-prompt message in the chat", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_FRONT_DOOR", "true");
    vi.mocked(apiFetch).mockReset();
    vi.mocked(showApiError).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.clear();
    queryClient.clear();
    useChatStore.getState().reset();
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setAuthStatus({
      email: "maria@example.org",
      id: "u-1",
      hasProfile: false,
      userType: null,
      termsAccepted: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("renders the profile card, prefilled from GFW", () => {
    renderBubble(addCard().id);
    expect(
      screen.getByText("We found your Global Forest Watch profile")
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Looks right" })).toBeDefined();
  });

  it("renders the empty card when there's no suggestion", () => {
    renderBubble(addCard({ found: false }).id);
    expect(
      screen.getByText("Help us tailor Global Nature Watch")
    ).toBeDefined();
  });

  it("Not now removes the card and counts a dismissal", () => {
    const card = addCard();
    renderBubble(card.id);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(useChatStore.getState().messages.some((m) => m.id === card.id)).toBe(
      false
    );
    expect(
      JSON.parse(localStorage.getItem("gnw_profile_ask_v1:u-1")!)
    ).toMatchObject({ dismissals: 1 });
  });

  it("Looks right saves and removes the card", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "u-1",
          email: "maria@example.org",
          hasProfile: true,
          termsAccepted: true,
        }),
        { status: 200 }
      )
    );
    const card = addCard();
    renderBubble(card.id);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    });

    await waitFor(() => expect(useAuthStore.getState().hasProfile).toBe(true));
    expect(useChatStore.getState().messages.some((m) => m.id === card.id)).toBe(
      false
    );
    expect(
      JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string)
    ).toEqual({
      sector_code: "government",
      role_code: "analyst",
      country_code: "BR",
      has_profile: true,
    });
  });

  it("keeps the card and says so when saving fails", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response("", { status: 500 }));
    const card = addCard();
    renderBubble(card.id);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    });

    await waitFor(() => expect(showApiError).toHaveBeenCalledOnce());
    expect(useChatStore.getState().messages.some((m) => m.id === card.id)).toBe(
      true
    );
    expect(useAuthStore.getState().hasProfile).toBe(false);
    const button = screen.getByRole("button", {
      name: "Looks right",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
