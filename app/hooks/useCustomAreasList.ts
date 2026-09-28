import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  ListCustomAreasResponseSchema,
  type ListCustomAreasResponse,
} from "../schemas/api/custom_areas/get";
import { useErrorHandler } from "./useErrorHandler";
import { apiFetch } from "@/app/lib/api-client";

const PAGE_SIZE = 100;

/**
 * Fetches every custom area of the user. The endpoint is paginated (50 rows
 * by default) and sets `X-Next-Offset` while more pages remain.
 */
export async function fetchCustomAreas(): Promise<ListCustomAreasResponse> {
  const areas: ListCustomAreasResponse = [];
  let offset: number | null = 0;

  while (offset !== null) {
    const res = await apiFetch(
      `/api/custom_areas?limit=${PAGE_SIZE}&offset=${offset}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!res.ok) {
      const error = await res.json();
      const errorWithStatus = new Error(
        error.error || `Request failed: ${res.statusText}`
      );
      (errorWithStatus as Error & { status?: number }).status = res.status;
      throw errorWithStatus;
    }

    areas.push(...ListCustomAreasResponseSchema.parse(await res.json()));
    const next = res.headers.get("X-Next-Offset");
    offset = next === null ? null : Number(next);
  }

  return areas;
}

export function useCustomAreasList() {
  const { showServiceUnavailableError, showApiError } = useErrorHandler();

  const {
    data: customAreas,
    isLoading,
    error,
    refetch,
  } = useQuery<ListCustomAreasResponse>({
    queryKey: ["customAreas"],
    queryFn: fetchCustomAreas,
  });

  useEffect(() => {
    if (error) {
      const errorWithStatus = error as Error & { status?: number };
      if (
        errorWithStatus.status === 400 ||
        errorWithStatus.status === 401 ||
        errorWithStatus.status === 403
      ) {
        showServiceUnavailableError("Custom Areas");
      } else if (
        errorWithStatus.status &&
        errorWithStatus.status >= 400 &&
        errorWithStatus.status < 500
      ) {
        showApiError(error, { title: "Unable to Load Areas" });
      }
    }
  }, [error, showServiceUnavailableError, showApiError]);

  return {
    customAreas,
    isLoading,
    error,
    refetch,
  };
}

export function useCustomAreasListSuspense() {
  const result = useSuspenseQuery<ListCustomAreasResponse>({
    queryKey: ["customAreas"],
    queryFn: fetchCustomAreas,
  });

  return {
    customAreas: result.data,
    refetch: result.refetch,
  } as const;
}
