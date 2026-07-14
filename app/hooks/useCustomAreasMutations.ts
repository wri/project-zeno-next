import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api-client";
import {
  CustomAreaSchema,
  type CustomArea,
} from "@/app/schemas/api/custom_areas/get";

async function updateCustomAreaName(
  areaId: string,
  name: string
): Promise<CustomArea> {
  const res = await apiFetch(`/api/custom_areas/${areaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || "Failed to rename area");
  }
  return CustomAreaSchema.parse(await res.json());
}

async function deleteCustomArea(areaId: string): Promise<void> {
  const res = await apiFetch(`/api/custom_areas/${areaId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.error || "Failed to delete area");
  }
}

export function useCustomAreasUpdate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ areaId, name }: { areaId: string; name: string }) =>
      updateCustomAreaName(areaId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customAreas"] });
      queryClient.invalidateQueries({ queryKey: ["aoiBrowse", "custom"] });
    },
  });

  return {
    renameArea: mutation.mutate,
    renameAreaAsync: mutation.mutateAsync,
    isRenaming: mutation.isPending,
  };
}

export function useCustomAreasDelete() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (areaId: string) => deleteCustomArea(areaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customAreas"] });
      queryClient.invalidateQueries({ queryKey: ["aoiBrowse", "custom"] });
    },
  });

  return {
    deleteArea: mutation.mutate,
    deleteAreaAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
  };
}
