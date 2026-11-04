// @vitest-environment happy-dom
import { useState } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AnalysisParametersToggle, {
  AnalysisInputsChips,
} from "../AnalysisParameters";

function Harness() {
  const [expanded, setExpanded] = useState(false);
  return (
    <AnalysisParametersToggle
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
    />
  );
}

const renderIn = (ui: React.ReactElement) =>
  render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);

describe("AnalysisParametersToggle", () => {
  it("is a disclosure with one label whose state is aria-expanded", () => {
    renderIn(<Harness />);
    const toggle = screen.getByRole("button", { name: "What was analysed" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);

    expect(
      screen
        .getByRole("button", { name: "What was analysed" })
        .getAttribute("aria-expanded")
    ).toBe("true");
    expect(screen.queryByText(/hide/i)).toBeNull();
  });
});

describe("AnalysisInputsChips", () => {
  it("says so when the inputs were not recorded", () => {
    renderIn(<AnalysisInputsChips inputs={{ recorded: false }} />);
    expect(
      screen.getByText("Inputs were not recorded for this analysis")
    ).toBeTruthy();
  });

  it("shows the recorded inputs as chips", () => {
    renderIn(
      <AnalysisInputsChips
        inputs={{
          recorded: true,
          areas: [{ name: "Acre, Brazil" }],
          datasets: [{ name: "Tree cover loss" }],
          canopyCover: [30],
          years: [{ start: 2001, end: 2024 }],
        }}
      />
    );
    expect(screen.getByText("Acre, Brazil")).toBeTruthy();
    expect(screen.getByText("Tree cover loss")).toBeTruthy();
    expect(screen.queryByText(/not recorded/)).toBeNull();
  });
});
