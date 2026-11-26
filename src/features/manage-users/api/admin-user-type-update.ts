import {
  mutationOptions,
  useMutation,
  useMutationState,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
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
import { ADMIN_USERS_QUERY_KEY } from "./admin-users-list";
import { responseError } from "./http";

interface UpdateUserTypeArgs {
  userId: string;
  userType: AssignableUserType;
}

const USER_TYPE_MUTATION_KEY = ["adminUsers", "userType"] as const;

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
  if (!res.ok) throw await responseError(res);

  const data = await res.json();
  return UserModelSchema.parse(data);
}

export const userTypeUpdate = (queryClient: QueryClient) =>
  mutationOptions({
    mutationKey: USER_TYPE_MUTATION_KEY,
    mutationFn: updateUserType,
    // Swap in the server's copy of the user: refetching would reload every
    // page of the list for one changed row. Cancel any refetch already in
    // flight first: it may predate the PATCH and would overwrite the patch.
    onSuccess: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      queryClient.setQueryData<ListUsersResponse>(
        ADMIN_USERS_QUERY_KEY,
        (users) => users?.map((u) => (u.id === updated.id ? updated : u)),
        // One changed row is not a reload: keep the list's "Loaded at" time.
        {
          updatedAt: queryClient.getQueryState(ADMIN_USERS_QUERY_KEY)
            ?.dataUpdatedAt,
        }
      );
    },
  });

export function useAdminUserTypeUpdate() {
  return useMutation(userTypeUpdate(useQueryClient()));
}

/** The type each user is being changed to, while that change is saving. */
export function usePendingUserTypes(): Map<string, AssignableUserType> {
  const saving = useMutationState({
    filters: { mutationKey: USER_TYPE_MUTATION_KEY, status: "pending" },
    // The cache types variables as unknown; the key pins them to this one.
    select: (m) => m.state.variables as UpdateUserTypeArgs,
  });
  return new Map(saving.map((v) => [v.userId, v.userType]));
}
