// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WelcomeConsent, type WelcomeConsentProps } from "../WelcomeConsent";

function renderWelcome(props: Partial<WelcomeConsentProps> = {}) {
  const onContinue = vi.fn();
  render(
    <ChakraProvider value={defaultSystem}>
      <WelcomeConsent onContinue={onContinue} {...props} />
    </ChakraProvider>
  );
  return { onContinue };
}

describe("WelcomeConsent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Continue disabled until the terms are accepted", async () => {
    const { onContinue } = renderWelcome({
      pendingPrompt: "How much tree cover has Pará lost since 2020?",
    });
    const button = screen.getByRole("button", {
      name: /continue to your answer/i,
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox"));
    });
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("greets by first name and shows the waiting question", () => {
    renderWelcome({
      name: "Maria Silva",
      pendingPrompt: "How much tree cover has Pará lost since 2020?",
    });
    expect(screen.getByRole("heading").textContent).toContain("Welcome, Maria");
    expect(
      screen.getByText("How much tree cover has Pará lost since 2020?")
    ).toBeTruthy();
    // happy-dom has no layout, so the question never measures as overflowing.
    expect(screen.queryByRole("button", { name: /show/i })).toBeNull();
  });

  it("lets a question that overflows be expanded and collapsed again", () => {
    // Stand in for layout: the clamped question is taller than its box.
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(120);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(63);
    renderWelcome({ pendingPrompt: "Compare tree cover loss by year." });

    const toggle = screen.getByRole("button", { name: "Show full question" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("Show less");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("falls back to a generic greeting and Continue to Horizon", () => {
    renderWelcome();
    expect(screen.getByRole("heading").textContent).toContain(
      "Welcome to Global Nature Watch"
    );
    expect(
      screen.getByRole("button", { name: /^continue to horizon$/i })
    ).toBeTruthy();
  });

  it("tells people about account emails, and never mentions GFW", () => {
    renderWelcome();
    expect(
      screen.getByText(/agree to receive periodic account and system-related/i)
    ).toBeTruthy();
    expect(screen.queryByText(/global forest watch/i)).toBeNull();
  });

  it("links every consent document", () => {
    renderWelcome();
    const links = screen.getAllByRole("link").map((a) => a.textContent);
    expect(links).toEqual([
      "Terms of Use",
      "Global Nature Watch AI Terms of Use",
      "Privacy Policy",
      "Global Nature Watch AI Privacy Policy",
    ]);
  });
});
