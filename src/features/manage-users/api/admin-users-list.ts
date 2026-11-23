import { useQuery } from "@tanstack/react-query";
import {
  ListUsersResponseSchema,
  type ListUsersResponse,
  type UserModel,
} from "@/app/schemas/api/admin/users/get";
import { apiFetch } from "@/app/lib/api-client";
import { toManagedUser } from "../lib/managed-user";
import { responseError } from "./http";

export const ADMIN_USERS_QUERY_KEY = ["adminUsers"] as const;

// The endpoint's maximum page size.
const PAGE_SIZE = 200;
const PAGES_PER_BATCH = 4;

async function fetchAdminUsersPage(
  offset: number,
  signal?: AbortSignal
): Promise<ListUsersResponse> {
  const params = new URLSearchParams({
    limit: `${PAGE_SIZE}`,
    offset: `${offset}`,
  });

  const res = await apiFetch(`/api/admin/users?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });
  if (!res.ok) throw await responseError(res);

  const data = await res.json();
  return ListUsersResponseSchema.parse(data);
}

/**
 * Every user, newest first, four pages at a time; `onProgress` gets the
 * count after each batch. The endpoint pages by offset, so a sign-up during
 * the load shifts a row onto the next page; keep the first copy of each id.
 */
export async function fetchAllAdminUsers(
  onProgress: (loaded: number) => void,
  signal?: AbortSignal
): Promise<ListUsersResponse> {
  const users = new Map<string, UserModel>();
  for (let offset = 0; ; offset += PAGE_SIZE * PAGES_PER_BATCH) {
    const batch = await Promise.all(
      Array.from({ length: PAGES_PER_BATCH }, (_, i) =>
        fetchAdminUsersPage(offset + i * PAGE_SIZE, signal)
      )
    );
    for (const user of batch.flat()) {
      if (!users.has(user.id)) users.set(user.id, user);
    }
    onProgress(users.size);
    if (batch.some((page) => page.length < PAGE_SIZE)) {
      return [...users.values()];
    }
  }
}

// Module-level, so the mapped list is kept until the cached list changes.
const toManagedUsers = (users: ListUsersResponse) => users.map(toManagedUser);

export function useAdminUsersList(onProgress: (loaded: number) => void) {
  return useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: ({ signal }) => fetchAllAdminUsers(onProgress, signal),
    select: toManagedUsers,
    // A full load is one request per 200 users; don't repeat it on every
    // window focus.
    staleTime: 5 * 60_000,
  });
}
