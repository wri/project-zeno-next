// @vitest-environment happy-dom
/**
 * The header prompt meter only appears once the user has used 75% of their
 * daily prompts, and follows the auth store live as prompts are sent.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import system from "@/app/theme";
import useAuthStore from "@/app/store/authStore";

import PromptQuotaMeter from "../PromptQuotaMeter";

function renderMeter() {
  return render(
    <ChakraProvider value={system}>
      <PromptQuotaMeter />
    </ChakraProvider>
  );
}

describe("PromptQuotaMeter", () => {
  beforeEach(() => {
    useAuthStore.getState().setPromptUsage(0, 100);
  });

  it("renders nothing at 74% usage", () => {
    useAuthStore.getState().setPromptUsage(74, 100);
    renderMeter();
    expect(screen.queryByTestId("prompt-quota-meter")).toBeNull();
  });

  it("shows the count, info icon and bar at 75% usage", () => {
    useAuthStore.getState().setPromptUsage(75, 100);
    renderMeter();
    expect(screen.getByText("75 / 100 daily prompts")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /daily prompt limit/i })
    ).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("75");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("shows a full bar at 100% usage", () => {
    useAuthStore.getState().setPromptUsage(20, 20);
    renderMeter();
    expect(screen.getByText("20 / 20 daily prompts")).toBeTruthy();
    const fill = screen.getByRole("progressbar").firstElementChild!;
    expect(getComputedStyle(fill).width).toBe("100%");
  });

  it("appears and updates after a prompt without a reload", () => {
    useAuthStore.getState().setPromptUsage(14, 20);
    renderMeter();
    expect(screen.queryByTestId("prompt-quota-meter")).toBeNull();

    // chatStore.sendMessage applies the quota headers of each response.
    act(() => {
      useAuthStore.getState().setUsageFromHeaders({
        "X-Prompts-Used": "15",
        "X-Prompts-Quota": "20",
      });
    });
    expect(screen.getByText("15 / 20 daily prompts")).toBeTruthy();

    act(() => {
      useAuthStore.getState().setUsageFromHeaders({
        "X-Prompts-Used": "16",
        "X-Prompts-Quota": "20",
      });
    });
    expect(screen.getByText("16 / 20 daily prompts")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "16"
    );
  });

  it("explains the daily limit when the info icon is clicked", async () => {
    useAuthStore.getState().setPromptUsage(15, 20);
    renderMeter();
    fireEvent.click(
      screen.getByRole("button", { name: /daily prompt limit/i })
    );
    expect(await screen.findByText(/refresh every 24 hours/i)).toBeTruthy();
  });
});
