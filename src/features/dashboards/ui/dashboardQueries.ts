import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { searchAois } from "../api/aois";
import {
  createDashboard,
  createDashboardPayloadFromAoi,
  deleteWidget,
  getDashboard,
  listDashboards,
  updateWidget,
  type WidgetUpdate,
} from "../api/dashboards";
import type { AoiSearchResult, Dashboard } from "../api/schemas";
import type { WidgetPositionPatch } from "../lib/widgets";

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
  const enabled = trimmed.length >= 2;

  return useQuery({
    queryKey: dashboardKeys.aois(trimmed, source),
    queryFn: () =>
      searchAois({
        name: trimmed,
        source,
        limit: 25,
      }),
    enabled,
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

// Shared optimistic-update plumbing for the widget mutations: snapshot the
// cached dashboard, apply `apply` to its widgets, roll back on error and
// refetch on settle (the server is the position/config authority).
function useOptimisticWidgetMutation<TVars>(
  dashboardId: string,
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (widgets: Dashboard["widgets"], vars: TVars) => Dashboard["widgets"]
) {
  const queryClient = useQueryClient();
  const key = dashboardKeys.detail(dashboardId);

  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (previous) {
        queryClient.setQueryData<Dashboard>(key, {
          ...previous,
          widgets: apply(previous.widgets, vars),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useUpdateWidget(dashboardId: string) {
  return useOptimisticWidgetMutation(
    dashboardId,
    ({ widgetId, patch }: { widgetId: string; patch: WidgetUpdate }) =>
      updateWidget(dashboardId, widgetId, patch),
    (widgets, { widgetId, patch }) =>
      widgets.map((w) =>
        w.id === widgetId
          ? {
              ...w,
              ...(patch.position !== undefined
                ? { position: patch.position }
                : {}),
              ...(patch.config ? { config: patch.config } : {}),
            }
          : w
      )
  );
}

export function useDeleteWidget(dashboardId: string) {
  return useOptimisticWidgetMutation(
    dashboardId,
    (widgetId: string) => deleteWidget(dashboardId, widgetId),
    (widgets, widgetId) => widgets.filter((w) => w.id !== widgetId)
  );
}

export function useReorderWidgets(dashboardId: string) {
  return useOptimisticWidgetMutation(
    dashboardId,
    (patches: WidgetPositionPatch[]) =>
      Promise.all(patches.map((p) => updateWidget(dashboardId, p.id, p))),
    (widgets, patches) => {
      const positions = new Map(patches.map((p) => [p.id, p.position]));
      return widgets.map((w) =>
        positions.has(w.id) ? { ...w, position: positions.get(w.id)! } : w
      );
    }
  );
}
