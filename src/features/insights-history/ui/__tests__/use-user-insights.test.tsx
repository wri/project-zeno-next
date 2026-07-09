// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { InsightRecord } from "@/src/entities/insight";
import type { InsightsGateway } from "../../model/insights-gateway";
import { useUserInsights } from "../use-user-insights";

const record: InsightRecord = {
  id: "ins-1",
  title: "Tree cover loss",
  source: "GFW",
  createdAt: "2024-05-01T00:00:00.000Z",
  verification: "ai-generated",
  charts: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useUserInsights", () => {
  it("returns insights from the gateway", async () => {
    const gateway: InsightsGateway = {
      list: vi.fn().mockResolvedValue([record]),
    };
    const { result } = renderHook(() => useUserInsights(undefined, gateway), {
      wrapper,
    });

    await waitFor(() => expect(result.current.insights).toHaveLength(1));
    expect(result.current.insights[0].id).toBe("ins-1");
  });

  it("passes the threadId to the gateway", async () => {
    const gateway: InsightsGateway = { list: vi.fn().mockResolvedValue([]) };
    renderHook(() => useUserInsights("thread-9", gateway), { wrapper });

    await waitFor(() =>
      expect(gateway.list).toHaveBeenCalledWith("thread-9", expect.anything())
    );
  });
});
