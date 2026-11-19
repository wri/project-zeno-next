// @vitest-environment happy-dom
/**
 * The first-visit preview disclaimer on the map: it shows once the system
 * banner is dismissed and speaks the active locale, links included.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import system from "@/app/theme";
import { SYSTEM_BANNER_STORAGE_KEY } from "@/app/constants/system-banner";
import { catalogs, i18n } from "@/src/shared/lib/i18n";

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

  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("renders the support sentences whole, with the link inside, in the active locale", async () => {
    const es = catalogs.es;
    await act(() => i18n.changeLanguage("es"));
    renderPanel();

    // "Visita el <a>Centro de ayuda</a> para …": the link keeps its
    // words, and the sentence around it renders in full.
    const help = es["preview.help"]!;
    const label = help.match(/<a>(.*)<\/a>/)![1];
    const link = screen.getByRole("link", { name: label });
    expect(link.parentElement!.textContent).toContain(
      help.replace(/<\/?a>/g, "")
    );
    expect(
      screen.getByRole("button", { name: es["preview.dismiss"] })
    ).toBeTruthy();
  });
});
