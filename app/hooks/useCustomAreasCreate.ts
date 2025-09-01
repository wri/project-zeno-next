import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type CreateCustomAreaRequest,
  type CreateCustomAreaResponse,
} from "../schemas/api/custom_areas/post";
import { useErrorHandler } from "./useErrorHandler";

async function createCustomArea(
  data: CreateCustomAreaRequest
): Promise<CreateCustomAreaResponse> {
  const res = await fetch("/api/proxy/custom_areas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    const errorWithStatus = new Error(error.error || `Request failed: ${res.statusText}`);
    (errorWithStatus as any).status = res.status;
    throw errorWithStatus;
  }

  return res.json();
}

export function useCustomAreasCreate() {
  const queryClient = useQueryClient();
  const { showServiceUnavailableError, showApiError } = useErrorHandler();

  const {
    mutate: createArea,
    mutateAsync: createAreaAsync,
    isPending: isCreating,
    error,
  } = useMutation({
    mutationFn: createCustomArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customAreas"] });
    },
    onError: (error: Error & { status?: number }) => {
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        showServiceUnavailableError("Custom Areas");
      } else if (error.status && error.status >= 400 && error.status < 500) {
        showApiError(error, { title: "Unable to Create Area" });
      }
    },
  });

  return {
    createArea,
    createAreaAsync,
    isCreating,
    error,
  };
}
