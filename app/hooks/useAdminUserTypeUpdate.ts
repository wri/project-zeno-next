import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PatchUserTypeRequestSchema,
  type AssignableUserType,
} from "@/app/schemas/api/admin/users/patch";
import {
  UserModelSchema,
  type UserModel,
} from "@/app/schemas/api/admin/users/get";
import { apiFetch } from "@/app/lib/api-client";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}
