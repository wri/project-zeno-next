import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDashboard } from "../api/dashboards";
import type { DashboardCreateRequest } from "../api/schemas";

export function useCreateDashboard() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: DashboardCreateRequest) => createDashboard(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  return {
    createDashboard: mutation.mutate,
    createDashboardAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
