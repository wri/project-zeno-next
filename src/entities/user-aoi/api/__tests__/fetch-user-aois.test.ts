import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import { fetchUserAois } from "../fetch-user-aois";

const mockedFetch = vi.mocked(apiFetch);

function entry(id: string, over: object = {}) {
  return {
    id,
    relationship: "owner",
    name: `Area ${id}`,
    source: "custom",
    src_id: id,
    subtype: "custom-area",
    bbox: [0, 0, 1, 1],
    created_at: "2026-11-24T00:00:00",
    ...over,
  };
}

function page(entries: object[], nextOffset?: number): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (nextOffset !== undefined) headers.set("X-Next-Offset", `${nextOffset}`);
  return new Response(JSON.stringify(entries), { status: 200, headers });
}

describe("fetchUserAois", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("follows X-Next-Offset until the last page", async () => {
    mockedFetch
      .mockResolvedValueOnce(page([entry("a"), entry("b")], 100))
      .mockResolvedValueOnce(page([entry("c")]));

    const entries = await fetchUserAois();

    expect(entries.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(mockedFetch.mock.calls.map(([path]) => path)).toEqual([
      "/api/user_aois?limit=100&offset=0",
      "/api/user_aois?limit=100&offset=100",
    ]);
  });

  // The API returns a KBA id as a number; the map addresses areas by string.
  it("reads every source id as a string", async () => {
    mockedFetch.mockResolvedValueOnce(
      page([
        entry("k", { relationship: "saved", source: "kba", src_id: 12345 }),
      ])
    );

    const [kba] = await fetchUserAois();

    expect(kba.src_id).toBe("12345");
  });

  it("throws with the status on failure", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 401, statusText: "Nope" })
    );

    await expect(fetchUserAois()).rejects.toMatchObject({ status: 401 });
  });
});
