// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/app/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
}));

import { toaster } from "@/app/components/ui/toaster";
import { apiFetch } from "@/app/lib/api-client";
import { queryClient as appQueryClient } from "@/app/lib/query-client";
import {
  USER_AOIS_QUERY_KEY,
  useSaveUserAoi,
  useUserAois,
} from "../use-user-aois";

const mockedFetch = vi.mocked(apiFetch);

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("useUserAois", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    vi.mocked(toaster.create).mockReset();
    appQueryClient.clear();
    // The app retries failed loads with backoff; the test needs the failure.
    appQueryClient.setQueryDefaults(USER_AOIS_QUERY_KEY, { retry: false });
  });

  // Several components read the list at once: the map menu and every
  // conversation area card.
  it("tells the user once when their areas can't be loaded", async () => {
    mockedFetch.mockResolvedValue(
      new Response("{}", { status: 403, statusText: "Forbidden" })
    );
    const wrapper = wrapperWith(appQueryClient);

    renderHook(
      () => {
        useUserAois();
        useUserAois();
      },
      { wrapper }
    );

    await waitFor(() => expect(toaster.create).toHaveBeenCalled());
    expect(toaster.create).toHaveBeenCalledTimes(1);
  });
});

describe("useSaveUserAoi", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  // A 409 means the cached list missed an area saved elsewhere.
  it("refreshes the user's areas when the area was already saved", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ detail: "Area is already in your areas" }),
        {
          status: 409,
        }
      )
    );
    const queryClient = newQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSaveUserAoi(), {
      wrapper: wrapperWith(queryClient),
    });

    await act(async () => {
      await result.current
        .saveUserAoiAsync({ source: "gadm", src_id: "BRA" })
        .catch(() => {});
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: USER_AOIS_QUERY_KEY });
  });
});
