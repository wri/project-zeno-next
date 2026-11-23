// @vitest-environment happy-dom
/**
 * The chat header's language selector: a globe button naming the active
 * language, a menu of the six languages in their own names, and a choice
 * that switches the UI at once and is saved.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import system from "@/app/theme";
import { i18n } from "@/src/shared/lib/i18n";

const changeLocale = vi.hoisted(() =>
  vi.fn((locale: string) => i18n.changeLanguage(locale))
);
vi.mock("../change-locale", () => ({ changeLocale }));

import { LocaleSwitcher } from "../LocaleSwitcher";

function renderSwitcher() {
  return render(
    <ChakraProvider value={system}>
      <LocaleSwitcher />
    </ChakraProvider>
  );
}

async function openMenu() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Language: / }));
  });
  return screen.findByRole("menu");
}

describe("LocaleSwitcher", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("shows the active language code and names it in its label", () => {
    renderSwitcher();
    const trigger = screen.getByRole("button", { name: "Language: English" });
    expect(trigger.textContent).toBe("EN");
  });

  it("lists the six languages in their own names, the active one checked", async () => {
    renderSwitcher();
    await openMenu();

    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((i) => i.querySelector("p")?.textContent)).toEqual([
      "Bahasa Indonesia",
      "English",
      "Español",
      "Français",
      "Português",
      "中文（简体）",
    ]);
    const checked = items.filter(
      (i) => i.getAttribute("aria-checked") === "true"
    );
    expect(checked.map((i) => i.querySelector("p")?.textContent)).toEqual([
      "English",
    ]);
    expect(
      screen.getByText("Only the AI assistant is translated for now.")
    ).toBeTruthy();
  });

  it("marks English as preferred in the active language, on English only", async () => {
    renderSwitcher();
    await openMenu();
    expect(screen.getAllByText("Preferred")).toHaveLength(1);
    expect(
      screen.getByRole("menuitemradio", { name: /English/ }).textContent
    ).toContain("Preferred");

    await act(() => i18n.changeLanguage("es"));
    expect(screen.getAllByText("Preferido")).toHaveLength(1);
    expect(
      screen.getByRole("menuitemradio", { name: /English/ }).textContent
    ).toContain("Preferido");
  });

  it("gives the English name under every other language", async () => {
    renderSwitcher();
    await openMenu();
    expect(screen.getByText("Spanish")).toBeTruthy();
    expect(screen.getByText("Chinese (Simplified)")).toBeTruthy();
  });

  it("switches to the chosen language and relabels itself", async () => {
    renderSwitcher();
    await openMenu();

    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: /Español/ }));
    });

    expect(changeLocale).toHaveBeenCalledWith("es");
    expect(
      screen.getByRole("button", { name: "Idioma: Español" }).textContent
    ).toBe("ES");
  });

  it("does nothing when the active language is chosen again", async () => {
    renderSwitcher();
    await openMenu();

    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: /English/ }));
    });

    expect(changeLocale).not.toHaveBeenCalled();
  });
});
