// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/app/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/app",
}));

import SamplePrompts from "../SamplePrompts";
import useChatStore from "@/app/store/chatStore";
import { usePromptStore } from "@/app/store/promptStore";

const sendSpy = vi.fn().mockResolvedValue({ isNew: false, id: "t1" });

describe("SamplePrompts", () => {
  beforeEach(() => {
    sendSpy.mockClear();
    useChatStore.setState({ sendMessage: sendSpy });
    usePromptStore.setState({ prompts: ["Prompt A", "Prompt B", "Prompt C"] });
  });

  it("sends a clicked starter prompt as input_source starter_prompt", async () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <SamplePrompts />
      </ChakraProvider>
    );

    fireEvent.click(await screen.findByText("Prompt B"));

    expect(sendSpy).toHaveBeenCalledWith("Prompt B", {
      inputSource: "starter_prompt",
    });
  });
});
