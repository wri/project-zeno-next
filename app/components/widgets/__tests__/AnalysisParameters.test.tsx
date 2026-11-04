// @vitest-environment happy-dom
import { useState } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AnalysisParametersToggle from "../AnalysisParameters";

function Harness() {
  const [expanded, setExpanded] = useState(false);
  return (
    <AnalysisParametersToggle
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
    />
  );
}

describe("AnalysisParametersToggle", () => {
  it("is a disclosure with one label whose state is aria-expanded", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <Harness />
      </ChakraProvider>
    );
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
