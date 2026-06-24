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
      <AnalysisCTAContent
        name="Brazil"
        status="idle"
        error={null}
        onAnalyze={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText("Brazil")).toBeTruthy();
    expect(screen.getByRole("button", { name: /analyze/i })).toBeTruthy();
  });

  it("calls onAnalyze when the button is clicked", () => {
    const onAnalyze = vi.fn();
    renderCTA(
      <AnalysisCTAContent
        name="Brazil"
        status="idle"
        error={null}
        onAnalyze={onAnalyze}
        onCancel={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it("disables the action and signals progress while running", () => {
    renderCTA(
      <AnalysisCTAContent
        name="Brazil"
        status="running"
        error={null}
        onAnalyze={() => {}}
        onCancel={() => {}}
      />
    );

    const button = screen.getByRole("button", { name: /analyz/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/analyzing/i)).toBeTruthy();
  });

  it("shows a Cancel button while running", () => {
    renderCTA(
      <AnalysisCTAContent
        name="Brazil"
        status="running"
        error={null}
        onAnalyze={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
  });

  it("calls onCancel when the Cancel button is clicked", () => {
    const onCancel = vi.fn();
    renderCTA(
      <AnalysisCTAContent
        name="Brazil"
        status="running"
        error={null}
        onAnalyze={() => {}}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not show a Cancel button when idle", () => {
    renderCTA(
      <AnalysisCTAContent
        name="Brazil"
        status="idle"
        error={null}
        onAnalyze={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });

  it("shows the error message when status is error", () => {
    renderCTA(
      <AnalysisCTAContent
        name="Brazil"
        status="error"
        error={new Error("Something went wrong")}
        onAnalyze={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });
});
