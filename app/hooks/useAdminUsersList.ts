import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ListUsersResponseSchema,
  type ListUsersResponse,
} from "@/app/schemas/api/admin/users/get";
import { apiFetch } from "@/app/lib/api-client";

async function fetchAdminUsers(emailQuery: string): Promise<ListUsersResponse> {
  const params = new URLSearchParams();
  if (emailQuery) params.set("email", emailQuery);
  params.set("limit", "50");

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

export function useAdminUsersList(emailQuery: string) {
  const trimmed = emailQuery.trim();
  return useQuery<ListUsersResponse>({
    queryKey: ["adminUsers", trimmed],
    queryFn: () => fetchAdminUsers(trimmed),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}
