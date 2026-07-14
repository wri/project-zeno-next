import { useQuery } from "@tanstack/react-query";

import { listDashboards } from "../api/dashboards";
import { dashboardKeys } from "./dashboardKeys";

export function useDashboards() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: listDashboards,
    staleTime: 10_000,
  });
}
