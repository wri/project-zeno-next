// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DatasetRow, type DatasetRowProps } from "../DatasetRow";

const dataset = {
  dataset_name: "Tree cover loss",
  cadence: "annual",
  geographic_coverage: "global",
  provider: "UMD",
};

function renderRow(props: Partial<DatasetRowProps> = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <DatasetRow dataset={dataset} {...props} />
    </ChakraProvider>
  );
}

describe("DatasetRow", () => {
  it("shows the title and meta line", () => {
    renderRow();
    expect(screen.getByText("Tree cover loss")).toBeTruthy();
    expect(screen.getByText("annual · global · UMD")).toBeTruthy();
  });

  // In chat it sits among AREA and ANALYSIS cards, so it says what it is.
  it("shows the DATA eyebrow only when asked (chat card)", () => {
    const { unmount } = renderRow({ showKind: true });
    expect(screen.getByText("DATA")).toBeTruthy();
    unmount();

    renderRow();
    expect(screen.queryByText("DATA")).toBeNull();
  });

  it("badges view-only datasets and nothing else", () => {
    const { unmount } = renderRow({ viewOnly: true });
    expect(screen.getByText("VIEW ONLY")).toBeTruthy();
    unmount();

    renderRow();
    expect(screen.queryByText("VIEW ONLY")).toBeNull();
  });

  // The chat card reports what the agent picked; the legend owns on/off.
  it("is static by default (chat card): no switch", () => {
    renderRow();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("opens the info modal without toggling", async () => {
    const onChange = vi.fn();
    renderRow({
      interaction: { mode: "toggle", checked: false, onChange },
    });

    await act(async () => {
      fireEvent.click(
        screen.getByLabelText("Show dataset info: Tree cover loss")
      );
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
