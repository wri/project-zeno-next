// @vitest-environment happy-dom
/**
 * The first-visit preview disclaimer on the map: it shows once the system
 * banner is dismissed and speaks the active locale, links included.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import system from "@/app/theme";
import { SYSTEM_BANNER_STORAGE_KEY } from "@/app/constants/system-banner";
import { i18n } from "@/src/shared/lib/i18n";

import DisclaimerPanel from "../DisclaimerPanel";

function renderPanel() {
  return render(
    <ChakraProvider value={system}>
      <DisclaimerPanel />
    </ChakraProvider>
  );
}

describe("DisclaimerPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(SYSTEM_BANNER_STORAGE_KEY, "true");
  });

  it("renders the body, support sentences, links and dismiss in the active locale", async () => {
    await act(() => i18n.changeLanguage("es"));
    try {
      renderPanel();

      expect(screen.getByText(/Esta es una vista previa/)).toBeTruthy();
      expect(screen.getByRole("link", { name: "aquí" })).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Centro de ayuda" })
      ).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Preguntas frecuentes" })
      ).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Problemas conocidos" })
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Descartar aviso" })
      ).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage("en"));
    }
  });
});
