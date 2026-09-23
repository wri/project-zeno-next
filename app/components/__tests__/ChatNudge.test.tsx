// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The chatStore import chain reaches the Chakra toaster (.tsx); stub it.
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

// Picking a dataset_choice option adds its layers to the map; keep that off
// the map store so the test only observes the chat send.
vi.mock("@/app/utils/nudgeDataset", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  addSuggestedDatasetToMap: vi.fn(),
}));

import ChatNudge from "../ChatNudge";
import useChatStore from "@/app/store/chatStore";
import type { Nudge } from "@/app/types/chat";

const sendSpy = vi.fn().mockResolvedValue({ isNew: false, id: "t1" });

const renderNudge = (nudge: Nudge) =>
  render(
    <ChakraProvider value={defaultSystem}>
      <ChatNudge nudge={nudge} />
    </ChakraProvider>
  );

describe("ChatNudge", () => {
  beforeEach(() => {
    sendSpy.mockClear();
    useChatStore.setState({ sendMessage: sendSpy });
  });

  it("sends the picked option as a nudge response carrying the nudge type and index", () => {
    renderNudge({ type: "aoi_choice", options: ["Pará", "Paraná"] });

    fireEvent.click(screen.getByText("Paraná"));

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith("Paraná", {
      inputSource: "nudge",
      nudgeResponse: { type: "aoi_choice", option_index: 1 },
    });
  });

  it("passes an empty or ad hoc nudge type through unchanged", () => {
    renderNudge({ type: "", options: ["Yes", "No"] });

    fireEvent.click(screen.getByText("Yes"));

    expect(sendSpy).toHaveBeenCalledWith("Yes", {
      inputSource: "nudge",
      nudgeResponse: { type: "", option_index: 0 },
    });
  });

  it("ignores a second pick once an option is chosen", () => {
    renderNudge({ type: "confirm", options: ["Yes", "No"] });

    fireEvent.click(screen.getByText("Yes"));
    fireEvent.click(screen.getByText("No"));

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
