import { useQuery } from "@tanstack/react-query";
import {
  ListCustomAreasResponseSchema,
  type ListCustomAreasResponse,
} from "../schemas/api/custom_areas/get";

async function fetchCustomAreas(): Promise<ListCustomAreasResponse> {
  const res = await fetch("/api/proxy/custom_areas", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Request failed: ${res.statusText}`);
  }

  const data = await res.json();
  return ListCustomAreasResponseSchema.parse(data);
}

export function useCustomAreasList() {
  const {
    data: customAreas,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customAreas"],
    queryFn: fetchCustomAreas,
  });

  return {
    customAreas,
    isLoading,
    error,
    refetch,
  };
}
