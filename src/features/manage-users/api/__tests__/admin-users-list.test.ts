import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import { fetchAllAdminUsers } from "../admin-users-list";

const mockedFetch = vi.mocked(apiFetch);

const user = (id: string) => ({
  id,
  email: `${id}@example.org`,
  name: id,
  userType: "regular",
});

const ids = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => `u${from + i}`);

const offsetOf = (url: string) =>
  Number(new URL(url, "http://x").searchParams.get("offset"));

/**
 * Serves `total` users newest first, 200 a page, as the endpoint does; a
 * page in `shifted` replaces the one at that offset. Requests run in
 * parallel, so pages are served by offset, not by call order.
 */
function serve(total: number, shifted: Record<number, string[]> = {}) {
  mockedFetch.mockImplementation(async (url) => {
    const offset = offsetOf(`${url}`);
    const page =
      shifted[offset] ??
      ids(offset, Math.max(0, Math.min(200, total - offset)));
    return new Response(JSON.stringify(page.map(user)), { status: 200 });
  });
}

const requestedOffsets = () =>
  mockedFetch.mock.calls.map(([url]) => offsetOf(`${url}`));

describe("fetchAllAdminUsers", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it.each<[string, number, number[], number[]]>([
    ["one short page", 3, [0, 200, 400, 600], [3]],
    [
      "a short page in the second batch",
      1203,
      [0, 200, 400, 600, 800, 1000, 1200, 1400],
      [800, 1203],
    ],
    [
      "a total that fills the batch exactly",
      800,
      [0, 200, 400, 600, 800, 1000, 1200, 1400],
      [800, 800],
    ],
    ["no users", 0, [0, 200, 400, 600], [0]],
  ])(
    "requests four pages at a time and stops after the batch with %s",
    async (_, total, offsets, progress) => {
      serve(total);
      const onProgress = vi.fn();

      const users = await fetchAllAdminUsers(onProgress);

      expect(users.map((u) => u.id)).toEqual(ids(0, total));
      expect(requestedOffsets()).toEqual(offsets);
      expect(onProgress.mock.calls.map(([n]) => n)).toEqual(progress);
    }
  );

  it("keeps one copy of a user that a sign-up pushed into the next batch", async () => {
    serve(1000, { 800: ["u799", ...ids(800, 199)] });

    const users = await fetchAllAdminUsers(vi.fn());

    expect(users.map((u) => u.id)).toEqual(ids(0, 999));
  });

  it("passes the abort signal to every request", async () => {
    serve(3);
    const { signal } = new AbortController();

    await fetchAllAdminUsers(vi.fn(), signal);

    for (const [, init] of mockedFetch.mock.calls) {
      expect(init?.signal).toBe(signal);
    }
  });

  it.each([
    ["the server's detail", { detail: "Superuser only" }, "Superuser only"],
    ["the server's error", { error: "Not allowed" }, "Not allowed"],
    ["the status text without either", {}, "Request failed: Forbidden"],
  ])("fails with %s", async (_, body, message) => {
    mockedFetch.mockImplementation(
      async () =>
        new Response(JSON.stringify(body), {
          status: 403,
          statusText: "Forbidden",
        })
    );

    await expect(fetchAllAdminUsers(vi.fn())).rejects.toThrow(message);
  });
});
