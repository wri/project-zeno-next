import { useQuery } from "@tanstack/react-query";
import {
  ListUsersResponseSchema,
  type ListUsersResponse,
  type UserModel,
} from "@/app/schemas/api/admin/users/get";
import { apiFetch } from "@/app/lib/api-client";

export const ADMIN_USERS_QUERY_KEY = ["adminUsers"] as const;

// The endpoint's maximum page size.
const PAGE_SIZE = 200;

async function fetchAdminUsersPage(offset: number): Promise<ListUsersResponse> {
  const params = new URLSearchParams({
    limit: `${PAGE_SIZE}`,
    offset: `${offset}`,
  });

  const res = await apiFetch(`/api/admin/users?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.error;
    } catch {}
    const errorWithStatus = new Error(
      detail || `Request failed: ${res.statusText}`
    );
    (errorWithStatus as Error & { status?: number }).status = res.status;
    throw errorWithStatus;
  }

  const data = await res.json();
  return ListUsersResponseSchema.parse(data);
}

/**
 * Every user, newest first. The endpoint pages by offset, so a sign-up during
 * the load shifts a row onto the next page; keep the first copy of each id.
 */
export async function fetchAllAdminUsers(): Promise<ListUsersResponse> {
  const users = new Map<string, UserModel>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchAdminUsersPage(offset);
    for (const user of page) {
      if (!users.has(user.id)) users.set(user.id, user);
    }
    if (page.length < PAGE_SIZE) return [...users.values()];
  }
}

export function useAdminUsersList() {
  return useQuery<ListUsersResponse>({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: fetchAllAdminUsers,
    // A full load is one request per 200 users; don't repeat it on every
    // window focus.
    staleTime: 5 * 60_000,
  });
}
