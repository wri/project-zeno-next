// @vitest-environment happy-dom
/**
 * The settings pages' "Back to map": it returns to the live conversation
 * (keeping the chat and layers) and names it, rather than resetting /app.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import useChatStore from "@/app/store/chatStore";

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  // React Router's Link needs a router; a plain anchor is enough here.
  Link: ({ href, ...rest }: { href: string } & React.ComponentProps<"a">) => (
    <a href={href} {...rest} />
  ),
}));

const threads = vi.hoisted(() => [
  { id: "t1", name: "Annual tree cover loss in Rondônia" },
]);
vi.mock("@/app/hooks/useThreadsInfinite", () => ({
  useThreadsInfinite: () => ({ threads }),
}));

import BackToMapLink from "../BackToMapLink";

function renderLink() {
  return render(
    <ChakraProvider value={system}>
      <BackToMapLink />
    </ChakraProvider>
  );
}

describe("BackToMapLink", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it("returns to the current conversation and names it", () => {
    useChatStore.setState({ currentThreadId: "t1" });
    renderLink();
    const link = screen.getByRole("link", { name: /Back to map/ });
    expect(link.getAttribute("href")).toBe("/app/threads/t1");
    expect(
      screen.getByTitle("Annual tree cover loss in Rondônia")
    ).toBeDefined();
  });

  it("goes to a new map, unnamed, with no conversation under way", () => {
    renderLink();
    const link = screen.getByRole("link", { name: "Back to map" });
    expect(link.getAttribute("href")).toBe("/app");
  });

  it("leaves the name out until the conversation list has it", () => {
    useChatStore.setState({ currentThreadId: "t-new" });
    renderLink();
    const link = screen.getByRole("link", { name: "Back to map" });
    expect(link.getAttribute("href")).toBe("/app/threads/t-new");
  });
});
