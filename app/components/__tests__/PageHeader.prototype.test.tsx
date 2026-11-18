// @vitest-environment happy-dom
/**
 * The PROTOTYPE badge replaces PREVIEW when prototype mode is on, and follows
 * the active locale like the rest of the header.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_PROTOTYPE_MODE", "true");
});

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";
import { i18n } from "@/src/shared/lib/i18n";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
  usePathname: () => "/app",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../WhatsNewModal", () => ({ default: () => null }));

import PageHeader from "../PageHeader";

describe("PageHeader prototype badge", () => {
  beforeEach(() => {
    useAuthStore.getState().setAuthStatus({
      email: "user@example.com",
      id: "u1",
      hasProfile: true,
      userType: null,
    });
  });

  it("translates the PROTOTYPE badge", async () => {
    await act(() => i18n.changeLanguage("pt"));
    try {
      render(
        <ChakraProvider value={system}>
          <PageHeader />
        </ChakraProvider>
      );
      expect(screen.getByText("PROTÓTIPO")).toBeTruthy();
      expect(screen.queryByText("PREVIEW")).toBeNull();
      expect(screen.queryByText("PRÉVIA")).toBeNull();
    } finally {
      await act(() => i18n.changeLanguage("en"));
    }
  });
});
