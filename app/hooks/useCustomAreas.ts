import { useMutation } from "@tanstack/react-query";
import {
  type CreateCustomAreaRequest,
  type CreateCustomAreaResponse,
} from "../schemas/CustomAreas";

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

export function useCustomAreas() {
  const {
    mutate: createArea,
    isPending: isCreating,
    error,
  } = useMutation({
    mutationFn: createCustomArea,
    onSuccess: (data) => {
      console.log("Custom area created:", data);
    },
    onError: (err) => {
      console.error("Failed to create custom area:", err);
    },
  });

  return {
    createArea,
    isCreating,
    error,
  };
}
