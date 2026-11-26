// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import { useUserAoisSuspense } from "@/src/entities/user-aoi";

import { UserAoisBoundary } from "../UserAoisBoundary";

const mockedFetch = vi.mocked(apiFetch);

function AreaCount() {
  const { data } = useUserAoisSuspense();
  return <p>{data.length} areas</p>;
}

function renderBoundary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <p>Rest of the page</p>
        <UserAoisBoundary loading={<p>Loading…</p>}>
          <AreaCount />
        </UserAoisBoundary>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

describe("UserAoisBoundary", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps a failed load inside the panel, with a retry", async () => {
    mockedFetch
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    renderBoundary();

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByText("Rest of the page")).toBeTruthy();

    fireEvent.click(retry);

    expect(await screen.findByText("0 areas")).toBeTruthy();
  });
});
