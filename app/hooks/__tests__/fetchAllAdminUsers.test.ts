import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import { fetchAllAdminUsers } from "../useAdminUsersList";

const mockedFetch = vi.mocked(apiFetch);

const user = (id: string) => ({
  id,
  email: `${id}@example.org`,
  name: id,
  userType: "regular",
});

const ids = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => `u${from + i}`);

const page = (userIds: string[]) =>
  new Response(JSON.stringify(userIds.map(user)), { status: 200 });

const requestedOffsets = () =>
  mockedFetch.mock.calls.map(([url]) =>
    new URL(`${url}`, "http://x").searchParams.get("offset")
  );

describe("fetchAllAdminUsers", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("pages by 200 until a short page", async () => {
    mockedFetch
      .mockResolvedValueOnce(page(ids(0, 200)))
      .mockResolvedValueOnce(page(ids(200, 200)))
      .mockResolvedValueOnce(page(ids(400, 3)));

    const users = await fetchAllAdminUsers();

    expect(users).toHaveLength(403);
    expect(requestedOffsets()).toEqual(["0", "200", "400"]);
  });

  it("stops after an empty page when the total is a multiple of 200", async () => {
    mockedFetch
      .mockResolvedValueOnce(page(ids(0, 200)))
      .mockResolvedValueOnce(page([]));

    expect(await fetchAllAdminUsers()).toHaveLength(200);
    expect(requestedOffsets()).toEqual(["0", "200"]);
  });

  it("keeps one copy of a user that a sign-up pushed onto the next page", async () => {
    mockedFetch
      .mockResolvedValueOnce(page(ids(0, 200)))
      .mockResolvedValueOnce(page(["u199", "u200"]));

    const users = await fetchAllAdminUsers();

    expect(users.map((u) => u.id)).toEqual(ids(0, 201));
  });

  it("fails with the server's detail", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Superuser only" }), {
        status: 403,
      })
    );

    await expect(fetchAllAdminUsers()).rejects.toThrow("Superuser only");
  });
});
