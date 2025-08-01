import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type CreateCustomAreaRequest,
  type CreateCustomAreaResponse,
} from "../schemas/api/custom_areas/post";

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
    throw new Error(error.error || `Request failed: ${res.statusText}`);
  }

  return res.json();
}

export function useCustomAreasCreate() {
  const queryClient = useQueryClient();

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
  });

  return {
    createArea,
    createAreaAsync,
    isCreating,
    error,
  };
}
