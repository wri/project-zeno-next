import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  ListCustomAreasResponseSchema,
  type ListCustomAreasResponse,
} from "../schemas/api/custom_areas/get";
import { useErrorHandler } from "./useErrorHandler";

async function fetchCustomAreas(): Promise<ListCustomAreasResponse> {
  const res = await fetch("/api/proxy/custom_areas", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.json();
    const errorWithStatus = new Error(error.error || `Request failed: ${res.statusText}`);
    (errorWithStatus as Error & { status?: number }).status = res.status;
    throw errorWithStatus;
  }

  const data = await res.json();
  return ListCustomAreasResponseSchema.parse(data);
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
      if (errorWithStatus.status === 400 || errorWithStatus.status === 401 || errorWithStatus.status === 403) {
        showServiceUnavailableError("Custom Areas");
      } else if (errorWithStatus.status && errorWithStatus.status >= 400 && errorWithStatus.status < 500) {
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
