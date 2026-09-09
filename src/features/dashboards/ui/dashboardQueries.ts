import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { searchAois } from "../api/aois";
import {
  addInsightWidget,
  addTextWidget,
  createDashboard,
  createDashboardPayloadFromAoi,
  deleteDashboard,
  deleteWidget,
  getDashboard,
  renameDashboard,
  updateWidget,
  updateSection,
  type WidgetUpdate,
} from "../api/dashboards";
import type { AoiSearchResult, Dashboard } from "../api/schemas";
import type { SectionMovePatch } from "../model/dashboard-sections";
import type { WidgetMovePatch } from "../model/widget-move";
import { dashboardKeys } from "../hooks/dashboardKeys";

export { dashboardKeys } from "../hooks/dashboardKeys";
export { useDashboards } from "../hooks/useDashboards";

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

export function useRenameDashboard(dashboardId: string) {
  const queryClient = useQueryClient();
  const key = dashboardKeys.detail(dashboardId);

  return useMutation({
    mutationFn: (name: string) => renameDashboard(dashboardId, name),
    // Optimistic: the PATCH response lacks insight expansion, so the new name
    // is applied to the cached dashboard and the server copy refetched on
    // settle rather than written from the response.
    onMutate: async (name: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (previous) {
        queryClient.setQueryData<Dashboard>(key, { ...previous, name });
      }
      return { previous };
    },
    onError: (_err, _name, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      // Prefix-matches the detail key and the list (dashboard switcher).
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dashboardId: string) => deleteDashboard(dashboardId),
    // Optimistic: the card disappears from the list immediately; the
    // snapshot is restored if the DELETE fails.
    onMutate: async (dashboardId: string) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.all });
      const previous = queryClient.getQueryData<Dashboard[]>(dashboardKeys.all);
      if (previous) {
        queryClient.setQueryData<Dashboard[]>(
          dashboardKeys.all,
          previous.filter((d) => d.id !== dashboardId)
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dashboardKeys.all, context.previous);
      }
    },
    onSettled: (_data, _err, dashboardId) => {
      queryClient.removeQueries({
        queryKey: dashboardKeys.detail(dashboardId),
      });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

// Shared optimistic-update plumbing for the widget mutations: snapshot the
// cached dashboard, apply `apply` to its widgets, roll back on error and
// refetch on settle (the server is the position/config authority).
function useOptimisticDashboardMutation<TVars>(
  dashboardId: string,
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (dashboard: Dashboard, vars: TVars) => Dashboard
) {
  const queryClient = useQueryClient();
  const key = dashboardKeys.detail(dashboardId);

  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Dashboard>(key);
      if (previous) {
        queryClient.setQueryData<Dashboard>(key, apply(previous, vars));
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

function useOptimisticWidgetMutation<TVars>(
  dashboardId: string,
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (widgets: Dashboard["widgets"], vars: TVars) => Dashboard["widgets"]
) {
  return useOptimisticDashboardMutation(dashboardId, mutationFn, (d, vars) => ({
    ...d,
    widgets: apply(d.widgets, vars),
  }));
}

// Mirrors the PATCH's three-valued grouping: a string moves the widget into
// that section and an explicit null moves it to the top level, while
// `undefined` leaves the grouping alone — `JSON.stringify` drops that key, so
// the server never sees it, and the cache must not act on it either.
function withSectionId<T extends { section_id?: string | null }>(
  widget: T,
  patch: { section_id?: string | null }
): T {
  return patch.section_id !== undefined
    ? { ...widget, section_id: patch.section_id }
    : widget;
}

export function useUpdateWidget(dashboardId: string) {
  return useOptimisticWidgetMutation(
    dashboardId,
    ({ widgetId, patch }: { widgetId: string; patch: WidgetUpdate }) =>
      updateWidget(dashboardId, widgetId, patch),
    (widgets, { widgetId, patch }) =>
      widgets.map((w) =>
        w.id === widgetId
          ? withSectionId(
              {
                ...w,
                ...(patch.position !== undefined
                  ? { position: patch.position }
                  : {}),
                ...(patch.config ? { config: patch.config } : {}),
              },
              patch
            )
          : w
      )
  );
}

// Chat-side "Add to dashboard" toggle-on. Not optimistic: the server assigns
// the widget id/position and the POST response lacks insight expansion, so
// the detail is refetched to render the new card.
export function useAddInsightWidget(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      insightId,
      config,
    }: {
      insightId: string;
      config?: Record<string, unknown>;
    }) => addInsightWidget(dashboardId, insightId, config),
    // Return the invalidation promise so the mutation stays `pending` until the
    // detail refetch lands. This add is not optimistic — `added` only flips once
    // the refetch reflects the new widget — so without this the button/switch
    // re-enables the instant the POST resolves, and a fast second click would
    // re-POST the same insight and create a duplicate widget.
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.detail(dashboardId),
      }),
  });
}

// "Text block" suggested module — adds a blank note widget directly, no chat
// round-trip. Not optimistic for the same reason as useAddInsightWidget: the
// server assigns the widget id/position, so the button stays disabled-safe
// only once the refetch actually reflects the new card.
export function useAddTextWidget(dashboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => addTextWidget(dashboardId),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.detail(dashboardId),
      }),
  });
}

export function useDeleteWidget(dashboardId: string) {
  return useOptimisticWidgetMutation(
    dashboardId,
    (widgetId: string) => deleteWidget(dashboardId, widgetId),
    (widgets, widgetId) => widgets.filter((w) => w.id !== widgetId)
  );
}

// A drag's whole write: the new position of every widget the move renumbered,
// plus `section_id` on the one that changed container. Optimistic, so the card
// lands in its new panel on drop rather than after the refetch.
export function useMoveWidgets(dashboardId: string) {
  return useOptimisticWidgetMutation(
    dashboardId,
    (patches: WidgetMovePatch[]) =>
      Promise.all(patches.map((p) => updateWidget(dashboardId, p.id, p))),
    (widgets, patches) => {
      const byId = new Map(patches.map((p) => [p.id, p]));
      return widgets.map((w) => {
        const patch = byId.get(w.id);
        if (!patch) return w;
        return withSectionId({ ...w, position: patch.position }, patch);
      });
    }
  );
}

// A section drag's write: the new position of every section the move
// renumbered. Optimistic, like widget moves.
export function useMoveSections(dashboardId: string) {
  return useOptimisticDashboardMutation(
    dashboardId,
    (patches: SectionMovePatch[]) =>
      Promise.all(
        patches.map((p) =>
          updateSection(dashboardId, p.id, { position: p.position })
        )
      ),
    (dashboard, patches) => {
      const positions = new Map(patches.map((p) => [p.id, p.position]));
      return {
        ...dashboard,
        sections: dashboard.sections.map((s) =>
          positions.has(s.id) ? { ...s, position: positions.get(s.id)! } : s
        ),
      };
    }
  );
}
