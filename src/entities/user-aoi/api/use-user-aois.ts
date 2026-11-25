import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import {
  showApiError,
  showServiceUnavailableError,
} from "@/app/hooks/useErrorHandler";
import { apiFetch } from "@/app/lib/api-client";

import { UserAoiSchema, type UserAoi } from "../model/user-aoi";
import { fetchUserAois } from "./fetch-user-aois";
import { responseError } from "./http";

export const USER_AOIS_QUERY_KEY = ["userAois"] as const;

export function useUserAois() {
  return useQuery({
    queryKey: USER_AOIS_QUERY_KEY,
    queryFn: ({ signal }) => fetchUserAois(signal),
  });
}

/**
 * Tell the user their areas couldn't be loaded. The shared query cache calls
 * this once per failed load, however many components read the list.
 */
export function showUserAoisLoadError(error: Error): void {
  const status = (error as { status?: number }).status;
  if (status === 400 || status === 401 || status === 403) {
    showServiceUnavailableError("My areas");
  } else if (status !== undefined && status >= 400 && status < 500) {
    showApiError(error, { title: "Unable to Load Areas" });
  }
}

export function useUserAoisSuspense() {
  return useSuspenseQuery({
    queryKey: USER_AOIS_QUERY_KEY,
    queryFn: ({ signal }) => fetchUserAois(signal),
  });
}

/** Address of a source area to save, such as `{source: "gadm", src_id: "BRA"}`. */
export interface SourceAreaRef {
  source: string;
  src_id: string;
}

async function createUserAoi(area: SourceAreaRef): Promise<UserAoi> {
  const res = await apiFetch("/api/user_aois", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(area),
  });
  if (!res.ok) throw await responseError(res);
  return UserAoiSchema.parse(await res.json());
}

async function updateUserAoiName({
  userAoiId,
  name,
}: {
  userAoiId: string;
  name: string;
}): Promise<UserAoi> {
  const res = await apiFetch(`/api/user_aois/${userAoiId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw await responseError(res);
  return UserAoiSchema.parse(await res.json());
}

async function deleteUserAoi(userAoiId: string): Promise<void> {
  const res = await apiFetch(`/api/user_aois/${userAoiId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await responseError(res);
}

/** Save a source area to the user's areas by reference; 409 if already saved. */
export function useSaveUserAoi() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createUserAoi,
    // A 409 means the cached list missed an area saved elsewhere, so the
    // list is refreshed after a failure too.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_AOIS_QUERY_KEY });
    },
  });

  return {
    saveUserAoi: mutation.mutate,
    saveUserAoiAsync: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}

/** Rename a user AOI: a saved area's label, or an owned area itself. */
export function useRenameUserAoi() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateUserAoiName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_AOIS_QUERY_KEY });
    },
  });

  return {
    renameUserAoi: mutation.mutate,
    renameUserAoiAsync: mutation.mutateAsync,
    isRenaming: mutation.isPending,
  };
}

/** Remove a user AOI: unsave a saved area, or delete an owned one. */
export function useDeleteUserAoi() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteUserAoi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_AOIS_QUERY_KEY });
    },
  });

  return {
    deleteUserAoi: mutation.mutate,
    deleteUserAoiAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
  };
}
