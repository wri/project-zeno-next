import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDashboard } from "../api/dashboards";
import type { DashboardCreateRequest } from "../api/schemas";
import { dashboardKeys } from "./dashboardKeys";

export function useCreateDashboard() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: DashboardCreateRequest) => createDashboard(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  return {
    createDashboard: mutation.mutate,
    createDashboardAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
