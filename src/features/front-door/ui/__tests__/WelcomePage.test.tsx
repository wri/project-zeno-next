// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = { push: vi.fn(), replace: vi.fn() };
const QUERY = "prompt=How+much+tree+cover+has+Par%C3%A1+lost%3F&utm_source=gfw";

vi.mock("@/app/lib/router", () => ({
  useRouter: () => router,
  usePathname: () => "/welcome",
  useSearchParams: () => new URLSearchParams(QUERY),
}));

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getToken: () => "token",
}));

vi.mock("@/app/hooks/useErrorHandler", () => ({
  showApiError: vi.fn(),
}));

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

import { apiFetch } from "@/app/lib/api-client";
import { showApiError } from "@/app/hooks/useErrorHandler";
import { TERMS_VERSION } from "@/app/config/terms";
import useAuthStore from "@/app/store/authStore";
import { WelcomePage } from "../WelcomePage";

function respond({
  patchStatus = 200,
  prefill = { found: false, source: null, suggestion: null } as unknown,
  prefillStatus = 200,
} = {}) {
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    if (path === "/api/auth/profile" && init?.method === "PATCH") {
      return new Response("{}", { status: patchStatus });
    }
    if (path === "/api/auth/profile/prefill") {
      return new Response(JSON.stringify(prefill), { status: prefillStatus });
    }
    throw new Error(`Unexpected request ${path}`);
  });
}

function renderPage() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <ChakraProvider value={defaultSystem}>
        <WelcomePage />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

async function acceptAndContinue() {
  await act(async () => {
    fireEvent.click(screen.getByRole("checkbox"));
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /continue to your answer/i })
    );
  });
}

function patchCalls() {
  return vi
    .mocked(apiFetch)
    .mock.calls.filter(([, init]) => init?.method === "PATCH");
}

describe("WelcomePage", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_FRONT_DOOR", "true");
    // The guard reads window.location.search, as in the browser.
    window.history.replaceState({}, "", `/welcome?${QUERY}`);
    vi.mocked(apiFetch).mockReset();
    router.push.mockReset();
    router.replace.mockReset();
    vi.mocked(showApiError).mockReset();
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setAuthStatus({
      email: "maria@example.org",
      id: "u-1",
      hasProfile: false,
      userType: null,
      name: "Maria Silva",
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("greets by first name and shows the waiting question", async () => {
    respond();
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Welcome, Maria"
    );
    expect(
      screen.getByText("How much tree cover has Pará lost?")
    ).toBeDefined();
  });

  it("stores the terms version, then continues to /app with the same query string", async () => {
    respond();
    renderPage();
    await acceptAndContinue();

    await waitFor(() =>
      expect(useAuthStore.getState().termsAccepted).toBe(true)
    );
    expect(patchCalls()).toHaveLength(1);
    expect(patchCalls()[0][1]?.body).toBe(
      JSON.stringify({ terms_version: TERMS_VERSION })
    );
    expect(useAuthStore.getState().termsVersion).toBe(TERMS_VERSION);
    expect(useAuthStore.getState().hasProfile).toBe(false);
    // The guard does the navigation, client-side, with the query intact.
    await waitFor(() => expect(router.replace).toHaveBeenCalledOnce());
    expect(router.replace).toHaveBeenCalledWith(`/app?${QUERY}`);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("stays on the page and says so when saving the consent fails", async () => {
    respond({ patchStatus: 500 });
    renderPage();
    await acceptAndContinue();

    await waitFor(() => expect(showApiError).toHaveBeenCalledOnce());
    expect(useAuthStore.getState().termsAccepted).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
    const button = screen.getByRole("button", {
      name: /continue to your answer/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("reassures GFW users when the backend finds their profile", async () => {
    respond({
      prefill: {
        found: true,
        source: "gfw",
        suggestion: { sector_code: "ngo" },
      },
    });
    renderPage();
    expect(
      await screen.findByText("Signed in with your Global Forest Watch account")
    ).toBeDefined();
  });

  it("doesn't mention GFW when there's no profile, or the lookup fails", async () => {
    respond({ prefillStatus: 404 });
    renderPage();
    await waitFor(() =>
      expect(
        vi
          .mocked(apiFetch)
          .mock.calls.some(([path]) => path === "/api/auth/profile/prefill")
      ).toBe(true)
    );
    expect(
      screen.queryByText("Signed in with your Global Forest Watch account")
    ).toBeNull();
  });

  it("lets Continue proceed while the GFW lookup is still pending", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path, init) => {
      if (path === "/api/auth/profile/prefill") return new Promise(() => {});
      if (init?.method === "PATCH") return new Response("{}", { status: 200 });
      throw new Error(`Unexpected request ${path}`);
    });
    renderPage();
    await acceptAndContinue();
    await waitFor(() =>
      expect(useAuthStore.getState().termsAccepted).toBe(true)
    );
  });
});
