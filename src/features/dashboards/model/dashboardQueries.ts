import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createDashboard,
  createDashboardPayloadFromAoi,
  getDashboard,
  listDashboards,
} from "../api/dashboards";
import { searchAois } from "../api/aois";
import type { AoiSearchResult } from "../api/schemas";

export const dashboardKeys = {
  all: ["dashboards"] as const,
  detail: (id: string) => ["dashboards", id] as const,
  aois: (query: string, source: string | null) =>
    ["dashboard-aois", query, source] as const,
};

export function useDashboards() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: listDashboards,
    staleTime: 10_000,
  });
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn: () => getDashboard(id),
    enabled: id.length > 0,
    staleTime: 10_000,
  });
}

export function useAoiSearch(query: string, source: string | null) {
  const trimmed = query.trim();
  const searchableQuery = trimmed.length >= 3 ? trimmed : "";

  return useQuery({
    queryKey: dashboardKeys.aois(searchableQuery, source),
    queryFn: () =>
      searchAois({
        name: searchableQuery || undefined,
        source,
        limit: searchableQuery ? 25 : 8,
      }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useCreateDashboardFromAoi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aoi: AoiSearchResult) =>
      createDashboard(createDashboardPayloadFromAoi(aoi)),
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.setQueryData(dashboardKeys.detail(dashboard.id), dashboard);
    },
  });
}
