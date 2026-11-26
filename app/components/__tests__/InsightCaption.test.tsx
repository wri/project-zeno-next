// @vitest-environment happy-dom
/**
 * The caption that says where an output came from (PZB-1738): "SOURCE:
 * <dataset>" for a direct data query, "AI-ASSISTED" otherwise. A surface
 * that does not know the dataset shows "SOURCE DATA", never a guessed name.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";

import InsightCaption from "../InsightCaption";

const renderCaption = (props: ComponentProps<typeof InsightCaption>) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <InsightCaption {...props} />
    </ChakraProvider>
  );

const openTooltip = async (learnMoreLabel: string) => {
  fireEvent.pointerMove(screen.getByLabelText(learnMoreLabel), {
    pointerType: "mouse",
  });
  return screen.findByRole("tooltip");
};

describe("InsightCaption", () => {
  it("names the dataset of a curated output, full name on hover", () => {
    const { container } = renderCaption({
      curated: true,
      datasetName: "Tree cover loss",
    });

    expect(container.textContent).toBe("SOURCE: Tree cover loss · Learn more");
    // Not a link in this first cut: plain text with the full name as a title,
    // since a long name truncates.
    const name = screen.getByText("Tree cover loss");
    expect(name.getAttribute("title")).toBe("Tree cover loss");
    expect(name.closest("a, button")).toBeNull();
  });

  it("says where the figures came from, naming the dataset", async () => {
    renderCaption({ curated: true, datasetName: "Tree cover loss" });

    const tooltip = await openTooltip("Learn more about source data");
    expect(tooltip.textContent).toContain("SOURCE DATA");
    expect(tooltip.textContent).toContain(
      "The charts and figures come straight from Tree cover loss through a direct data query. No AI model made them."
    );
  });

  it("shows SOURCE DATA, not a guessed name, when the dataset is unknown", async () => {
    const { container } = renderCaption({ curated: true });

    expect(container.textContent).toBe("SOURCE DATA · Learn more");
    const tooltip = await openTooltip("Learn more about source data");
    expect(tooltip.textContent).toContain(
      "come straight from the source data through a direct data query"
    );
  });

  it("treats an empty dataset name as unknown, in the label and the note", async () => {
    const { container } = renderCaption({ curated: true, datasetName: "" });

    expect(container.textContent).toBe("SOURCE DATA · Learn more");
    const tooltip = await openTooltip("Learn more about source data");
    expect(tooltip.textContent).toContain(
      "come straight from the source data through a direct data query"
    );
  });

  it("drops Learn more for a badge", () => {
    const { container } = renderCaption({
      curated: true,
      showLearnMore: false,
    });

    expect(container.textContent).toBe("SOURCE DATA");
  });

  it("keeps AI-ASSISTED and its disclaimer, with no dataset name", async () => {
    const { container } = renderCaption({ datasetName: "Tree cover loss" });

    expect(container.textContent).toBe("AI-ASSISTED · Learn more");
    const tooltip = await openTooltip("Learn more about AI-assisted analysis");
    expect(tooltip.textContent).toContain("AI models may produce incomplete");
  });
});
