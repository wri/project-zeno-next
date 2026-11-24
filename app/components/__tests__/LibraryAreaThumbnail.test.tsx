// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";
import type { UserAoi } from "@/src/entities/user-aoi";

import { LibraryAreaThumbnail } from "../LibraryAreaThumbnail";

const mockedFetch = vi.mocked(apiFetch);

const owned: UserAoi = {
  id: "entry-1",
  relationship: "owner",
  name: "Borena",
  source: "custom",
  src_id: "ca-1",
  subtype: "custom-area",
  bbox: [37, 3, 40, 6],
  created_at: "2026-11-24T00:00:00",
};

const saved: UserAoi = {
  ...owned,
  id: "entry-2",
  relationship: "saved",
  name: "Ethiopia",
  source: "gadm",
  src_id: "ETH",
  subtype: "country",
};

function renderThumbnail(entry: UserAoi) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ChakraProvider value={defaultSystem}>
        <LibraryAreaThumbnail entry={entry} />
      </ChakraProvider>
    </QueryClientProvider>
  );
}

describe("LibraryAreaThumbnail", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:outline");
    URL.revokeObjectURL = vi.fn();
  });

  it.each([
    ["an owned area", owned, "/api/geometry/custom/ca-1/thumbnail"],
    ["a saved area", saved, "/api/geometry/gadm/ETH/thumbnail"],
  ])("shows the outline the backend draws for %s", async (_, entry, path) => {
    mockedFetch.mockResolvedValue(
      new Response(new Blob(["png"], { type: "image/png" }), { status: 200 })
    );

    renderThumbnail(entry);

    const img = await screen.findByRole("img", { name: entry.name });
    expect(img.getAttribute("src")).toBe("blob:outline");
    expect(mockedFetch.mock.calls[0][0]).toContain(path);
  });

  it("falls back to the plain thumbnail when the backend has none", async () => {
    mockedFetch.mockResolvedValue(new Response("{}", { status: 404 }));

    renderThumbnail(owned);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(
      screen.queryByRole("img", { name: owned.name })?.getAttribute("src")
    ).not.toBe("blob:outline");
  });
});
