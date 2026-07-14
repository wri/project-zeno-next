import { useQuery } from "@tanstack/react-query";

import { listDashboards } from "../api/dashboards";

export function useDashboardsList() {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: listDashboards,
    staleTime: 10_000,
  });
}
