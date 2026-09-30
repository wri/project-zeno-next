// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  });

  it("falls back to a generic greeting and plain Continue", () => {
    renderWelcome();
    expect(screen.getByRole("heading").textContent).toContain(
      "Welcome to Global Nature Watch"
    );
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeTruthy();
  });

  it("shows the GFW reassurance only for GFW users", () => {
    const { unmount } = render(
      <ChakraProvider value={defaultSystem}>
        <WelcomeConsent onContinue={vi.fn()} />
      </ChakraProvider>
    );
    expect(screen.queryByText(/global forest watch account/i)).toBeNull();
    unmount();

    renderWelcome({ signedInWithGfw: true });
    expect(
      screen.getByText(/signed in with your global forest watch account/i)
    ).toBeTruthy();
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
