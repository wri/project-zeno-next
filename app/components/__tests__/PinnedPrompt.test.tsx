// @vitest-environment happy-dom
/**
 * The pinned recap of the prompt whose answer is being read, and the user
 * bubble it mirrors: both sit on Primary/100. The pinned card uses 13px text
 * and a hard two-line cut-off so a long prompt never grows the card over the
 * answer.
 *
 * happy-dom drops `var()` values and `display: -webkit-box` from computed
 * styles, so these assertions read the element's own emitted CSS rule, which
 * is where the design tokens are visible.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import { ChatMessage } from "@/app/types/chat";

import MessageBubble from "../MessageBubble";
import PinnedPrompt from "../PinnedPrompt";

const ONE_LINE_PROMPT = "Tree cover loss in Pará?";
const VERY_LONG_PROMPT = (
  "Compare tree cover loss, fire alerts and deforestation drivers across " +
  "every municipality in Pará and Mato Grosso between 2015 and 2024, " +
  "broken down by year, and explain which policies coincided with the " +
  "largest changes in each municipality. "
)
  .repeat(4)
  .trim();

function userMessage(text: string): ChatMessage {
  return {
    id: "m1",
    type: "user",
    message: text,
    timestamp: "2026-09-24T10:00:00.000Z",
  };
}

/** Declarations of the element's base (non-pseudo) emotion rule. */
function ownStyle(el: Element): Record<string, string> {
  const classes = [...el.classList].filter((c) => c.startsWith("css-"));
  const style: Record<string, string> = {};
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      const match = rule.cssText.match(/^\.(css-[\w-]+) \{([^]*)\}$/);
      if (!match || !classes.includes(match[1])) continue;
      for (const declaration of match[2].split(";")) {
        const [prop, ...value] = declaration.split(":");
        if (prop.trim()) style[prop.trim()] = value.join(":").trim();
      }
    }
  }
  return style;
}

function renderPinned(text: string) {
  const onJump = vi.fn();
  render(
    <ChakraProvider value={system}>
      <PinnedPrompt message={userMessage(text)} onJump={onJump} />
    </ChakraProvider>
  );
  return {
    onJump,
    card: screen.getByRole("button"),
    text: screen.getByText(text),
  };
}

describe.each([
  ["one-line", ONE_LINE_PROMPT],
  ["very long", VERY_LONG_PROMPT],
])("with a %s prompt", (_, prompt) => {
  describe("PinnedPrompt", () => {
    it("keeps the full prompt but cuts it at two lines with an ellipsis", () => {
      const { text } = renderPinned(prompt);
      expect(text.textContent).toBe(prompt);
      // -webkit-line-clamp draws the ellipsis itself on the last visible line.
      expect(ownStyle(text)).toMatchObject({
        "-webkit-line-clamp": "2",
        "-webkit-box-orient": "vertical",
        overflow: "hidden",
      });
    });

    it("uses 13px text", () => {
      const { text } = renderPinned(prompt);
      expect(ownStyle(text)["font-size"]).toBe("13px");
    });

    it("sits on a Primary/100 background", () => {
      const { card } = renderPinned(prompt);
      expect(ownStyle(card).background).toBe(
        "var(--chakra-colors-primary-100)"
      );
    });

    it("scrolls back to the original prompt when clicked", () => {
      const { card, onJump } = renderPinned(prompt);
      fireEvent.click(card);
      expect(onJump).toHaveBeenCalledOnce();
    });
  });

  describe("MessageBubble", () => {
    it("shows the user prompt on a Primary/100 background", () => {
      render(
        <ChakraProvider value={system}>
          <MessageBubble message={userMessage(prompt)} />
        </ChakraProvider>
      );
      const bubble = screen.getByText(prompt).closest("[class*='css-']");
      let node: Element | null = bubble;
      while (node && !ownStyle(node).background) node = node.parentElement;
      expect(node && ownStyle(node).background).toBe(
        "var(--chakra-colors-primary-100)"
      );
    });
  });
});
