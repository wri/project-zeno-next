// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));
vi.mock("@/app/utils/renameCustomArea", () => ({ renameCustomArea: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import { renameCustomArea } from "@/app/utils/renameCustomArea";
import { useCustomAreasUpdate } from "../useCustomAreasMutations";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
);

const serverArea = {
  id: "a1",
  user_id: "u1",
  name: "New",
  geometries: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

describe("useCustomAreasUpdate", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(renameCustomArea).mockReset();
  });

  it("renames the area on the map with the server's returned area", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify(serverArea), { status: 200 })
    );
    const { result } = renderHook(() => useCustomAreasUpdate(), { wrapper });

    await act(() =>
      result.current.renameAreaAsync({ areaId: "a1", name: "New" })
    );

    expect(renameCustomArea).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", name: "New" })
    );
  });

  it("leaves the map alone when the rename fails", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: "nope" }), { status: 500 })
    );
    const { result } = renderHook(() => useCustomAreasUpdate(), { wrapper });

    await act(async () => {
      await result.current
        .renameAreaAsync({ areaId: "a1", name: "New" })
        .catch(() => {});
    });

    await waitFor(() => expect(result.current.isRenaming).toBe(false));
    expect(renameCustomArea).not.toHaveBeenCalled();
  });
});
