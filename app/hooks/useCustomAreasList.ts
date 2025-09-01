import { useQuery } from "@tanstack/react-query";
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
    (errorWithStatus as any).status = res.status;
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
  } = useQuery({
    queryKey: ["customAreas"],
    queryFn: fetchCustomAreas,
    onError: (error: Error & { status?: number }) => {
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        showServiceUnavailableError("Custom Areas");
      } else if (error.status && error.status >= 400 && error.status < 500) {
        showApiError(error, { title: "Unable to Load Areas" });
      }
    },
  });

  return {
    customAreas,
    isLoading,
    error,
    refetch,
  };
}
