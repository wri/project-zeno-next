import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { apiFetch } from "@/app/lib/api-client";

import { UserAoiSchema, type UserAoi } from "../model/user-aoi";
import { fetchUserAois, readApiError } from "./fetch-user-aois";

export const USER_AOIS_QUERY_KEY = ["userAois"] as const;

export function useUserAois() {
  return useQuery({ queryKey: USER_AOIS_QUERY_KEY, queryFn: fetchUserAois });
}

export function useUserAoisSuspense() {
  return useSuspenseQuery({
    queryKey: USER_AOIS_QUERY_KEY,
    queryFn: fetchUserAois,
  });
}

/** Address of a source area to save, such as `{source: "gadm", src_id: "BRA"}`. */
export interface SourceAreaRef {
  source: string;
  src_id: string;
}

async function postUserAoi(area: SourceAreaRef): Promise<UserAoi> {
  const res = await apiFetch("/api/user_aois", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(area),
  });
  if (!res.ok) throw await readApiError(res, "Failed to save area");
  return UserAoiSchema.parse(await res.json());
}

async function patchUserAoi(entryId: string, name: string): Promise<UserAoi> {
  const res = await apiFetch(`/api/user_aois/${entryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw await readApiError(res, "Failed to rename area");
  return UserAoiSchema.parse(await res.json());
}

async function deleteUserAoi(entryId: string): Promise<void> {
  const res = await apiFetch(`/api/user_aois/${entryId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await readApiError(res, "Failed to delete area");
}

function useUserAoiMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: USER_AOIS_QUERY_KEY }),
  });
}

/** Save a source area to the user's areas by reference; 409 if already saved. */
export const useSaveUserAoi = () => useUserAoiMutation(postUserAoi);

/** Rename a user AOI: a saved area's label, or an owned area itself. */
export const useRenameUserAoi = () =>
  useUserAoiMutation(({ entryId, name }: { entryId: string; name: string }) =>
    patchUserAoi(entryId, name)
  );

/** Remove a user AOI: unsave a saved area, or delete an owned one. */
export const useDeleteUserAoi = () => useUserAoiMutation(deleteUserAoi);
