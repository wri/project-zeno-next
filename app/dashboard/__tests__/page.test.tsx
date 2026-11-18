// @vitest-environment happy-dom
/**
 * The user profile page and the settings shell around it, in the active locale.
 * Names the person typed and their email stay as entered.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("renders the page and settings shell in the active locale", async () => {
    await act(() => i18n.changeLanguage("es"));
    try {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "Perfil de usuario" })
      ).toBeTruthy();
      expect(screen.getByText("campos obligatorios")).toBeTruthy();
      expect(screen.getByText("Nombre")).toBeTruthy();
      expect(screen.getByText("Detalles adicionales")).toBeTruthy();
      expect(screen.getByText("Guardar cambios")).toBeTruthy();
      expect(
        screen.getByText("Envíame noticias y eventos de Global Nature Watch.")
      ).toBeTruthy();
      expect(
        screen.getByRole("heading", { name: "Eliminar tu cuenta" })
      ).toBeTruthy();
      expect(
        screen.getByRole("link", {
          name: "Solicitar la eliminación de la cuenta",
        })
      ).toBeTruthy();

      expect(screen.getByRole("link", { name: "Ayuda" })).toBeTruthy();
      expect(screen.getByText("Consultas disponibles")).toBeTruthy();
      expect(screen.getByText("ada@example.com")).toBeTruthy();
      expect(
        screen
          .getByRole("button", { name: "ada@example.com" })
          .getAttribute("title")
      ).toBe("Cerrar sesión");
      expect(screen.getByRole("link", { name: "Volver al mapa" })).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage("en"));
    }
  });
});
