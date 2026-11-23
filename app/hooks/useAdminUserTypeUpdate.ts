import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PatchUserTypeRequestSchema,
  type AssignableUserType,
} from "@/app/schemas/api/admin/users/patch";
import {
  UserModelSchema,
  type ListUsersResponse,
  type UserModel,
} from "@/app/schemas/api/admin/users/get";
import { apiFetch } from "@/app/lib/api-client";
import { ADMIN_USERS_QUERY_KEY } from "@/app/hooks/useAdminUsersList";

interface UpdateUserTypeArgs {
  userId: string;
  userType: AssignableUserType;
}

async function updateUserType({
  userId,
  userType,
}: UpdateUserTypeArgs): Promise<UserModel> {
  const payload = PatchUserTypeRequestSchema.parse({ user_type: userType });

  const res = await apiFetch(`/api/admin/users/${userId}/user-type`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
  return UserModelSchema.parse(data);
}

export function useAdminUserTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserType,
    // Swap in the server's copy of the user: refetching would reload every
    // page of the list for one changed row. Cancel any refetch already in
    // flight first: it may predate the PATCH and would overwrite the patch.
    onSuccess: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      queryClient.setQueryData<ListUsersResponse>(
        ADMIN_USERS_QUERY_KEY,
        (users) => users?.map((u) => (u.id === updated.id ? updated : u))
      );
    },
  });
}
