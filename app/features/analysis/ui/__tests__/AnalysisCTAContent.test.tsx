// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnalysisCTAContent } from "../AnalysisCTAContent";

const renderCTA = (ui: ReactElement) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);

describe("AnalysisCTAContent", () => {
  it("shows the area name and an Analyze action", () => {
    renderCTA(
      <AnalysisCTAContent name="Brazil" status="idle" onAnalyze={() => {}} />
    );

    expect(screen.getByText("Brazil")).toBeTruthy();
    expect(screen.getByRole("button", { name: /analyze/i })).toBeTruthy();
  });

  it("calls onAnalyze when the button is clicked", () => {
    const onAnalyze = vi.fn();
    renderCTA(
      <AnalysisCTAContent name="Brazil" status="idle" onAnalyze={onAnalyze} />
    );

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it("disables the action and signals progress while running", () => {
    renderCTA(
      <AnalysisCTAContent name="Brazil" status="running" onAnalyze={() => {}} />
    );

    const button = screen.getByRole("button", { name: /analyz/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/analyzing/i)).toBeTruthy();
  });
});
