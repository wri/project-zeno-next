// @vitest-environment happy-dom
/**
 * Zeno's own text on a new conversation (the greeting and the sample
 * prompts) follows the UI language, and switches with it.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => "/app",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import system from "@/app/theme";
import useChatStore from "@/app/store/chatStore";
import { SAMPLE_PROMPT_KEYS } from "@/app/constants/sample-prompts";
import { catalogs, i18n, type Locale } from "@/src/shared/lib/i18n";
import ChatMessages from "../ChatMessages";

function renderMessages() {
  return render(
    <ChakraProvider value={system}>
      <ChatMessages />
    </ChakraProvider>
  );
}

/** The sample prompts on screen, by their index in the prompt lists. */
function shownPromptIndices(locale: Locale): number[] {
  return SAMPLE_PROMPT_KEYS.map(
    (key) => (catalogs[locale] as Record<string, string>)[key]
  )
    .map((prompt, i) => (screen.queryByText(prompt) ? i : -1))
    .filter((i) => i >= 0);
}

describe("ChatMessages greeting", () => {
  beforeEach(() => useChatStore.getState().reset());
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("greets in English by default", () => {
    renderMessages();
    expect(
      screen.getByText("Welcome to Global Nature Watch Horizon!")
    ).toBeTruthy();
    expect(shownPromptIndices("en")).toHaveLength(3);
  });

  it("switches the greeting and the same three prompts with the UI language", async () => {
    renderMessages();
    const english = shownPromptIndices("en");

    await act(() => i18n.changeLanguage("es"));

    expect(
      screen.getByText("¡Bienvenido a Global Nature Watch Horizon!")
    ).toBeTruthy();
    expect(shownPromptIndices("es")).toEqual(english);
  });
});
