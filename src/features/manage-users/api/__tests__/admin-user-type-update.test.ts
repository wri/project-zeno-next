import { describe, it, expect, vi } from "vitest";
import { MutationObserver, QueryClient } from "@tanstack/react-query";

vi.mock("@/app/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/app/lib/api-client";
import { ADMIN_USERS_QUERY_KEY } from "../admin-users-list";
import { userTypeUpdate } from "../admin-user-type-update";

const ana = { id: "ana", email: "ana@example.org", userType: "regular" };
const bo = { id: "bo", email: "bo@example.org", userType: "regular" };

describe("userTypeUpdate", () => {
  it("swaps the server's copy into the list and keeps its load time", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(ADMIN_USERS_QUERY_KEY, [ana, bo], {
      updatedAt: 1_000,
    });
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify({ ...bo, userType: "pro" }))
    );

    await new MutationObserver(queryClient, userTypeUpdate(queryClient)).mutate(
      { userId: "bo", userType: "pro" }
    );

    expect(queryClient.getQueryData(ADMIN_USERS_QUERY_KEY)).toEqual([
      ana,
      { ...bo, userType: "pro" },
    ]);
    expect(
      queryClient.getQueryState(ADMIN_USERS_QUERY_KEY)?.dataUpdatedAt
    ).toBe(1_000);
  });
});
