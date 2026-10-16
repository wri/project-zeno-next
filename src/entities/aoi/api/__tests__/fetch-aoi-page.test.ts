import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/app/lib/api-client";

import { fetchAoiPage } from "../fetch-aoi-page";

const mockedFetch = vi.mocked(apiFetch);

function respond(body: unknown, headers: Record<string, string> = {}) {
  mockedFetch.mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200, headers })
  );
}

const requestedUrl = () => new URL(mockedFetch.mock.calls[0][0], "http://x");

describe("fetchAoiPage", () => {
  beforeEach(() => mockedFetch.mockReset());

  // One request for several sources, so the backend ranks them together.
  it("sends each source as a repeated param", async () => {
    respond([]);
    await fetchAoiPage({ name: " santa ", sources: ["gadm", "wdpa"] });

    const url = requestedUrl();
    expect(url.searchParams.getAll("source")).toEqual(["gadm", "wdpa"]);
    expect(url.searchParams.get("name")).toBe("santa");
  });

  it("sends no source to search every source, and no name to browse", async () => {
    respond([]);
    await fetchAoiPage({});

    const url = requestedUrl();
    expect(url.searchParams.has("source")).toBe(false);
    expect(url.searchParams.has("name")).toBe(false);
  });

  it("reads the next offset from X-Next-Offset, null when absent", async () => {
    respond([], { "X-Next-Offset": "20" });
    expect((await fetchAoiPage({ name: "pará" })).nextOffset).toBe(20);

    respond([]);
    expect((await fetchAoiPage({ name: "pará" })).nextOffset).toBeNull();
  });

  it("surfaces the backend's error detail", async () => {
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "limit too high" }), {
        status: 422,
      })
    );
    await expect(fetchAoiPage({ limit: 500 })).rejects.toThrow(
      "limit too high"
    );
  });
});
