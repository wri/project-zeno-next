// @vitest-environment happy-dom
/**
 * The user profile page and the settings shell around it, in the active locale.
 * Names the person typed and their email stay as entered.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";
import { catalogs, i18n } from "@/src/shared/lib/i18n";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/hooks/useAuthGuard", () => ({
  useAuthGuard: () => true,
}));

vi.mock("@/app/hooks/useThreadsInfinite", () => ({
  useThreadsInfinite: () => ({ threads: [] }),
}));

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(async () => ({ ok: false })),
  clearToken: vi.fn(),
}));

import UserProfilePage from "../page";

function renderPage() {
  return render(
    <ChakraProvider value={system}>
      <UserProfilePage />
    </ChakraProvider>
  );
}

describe("User profile page", () => {
  beforeEach(() => {
    useAuthStore.getState().setAuthStatus({
      email: "ada@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
    useAuthStore.getState().setPromptUsage(4, 20);
  });

  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("renders the page and settings shell in the active locale", async () => {
    const es = catalogs.es;
    await act(() => i18n.changeLanguage("es"));
    renderPage();

    expect(
      screen.getByRole("heading", { name: es["account.profile"] })
    ).toBeTruthy();
    expect(screen.getByText(es["profile.save"]!)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: es["settings.backToMap"] })
    ).toBeTruthy();
    // The email stays as entered.
    expect(
      screen
        .getByRole("button", { name: "ada@example.com" })
        .getAttribute("title")
    ).toBe(es["account.signOut"]);
  });
});
