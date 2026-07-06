import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  DashboardSchema,
  ListDashboardsResponseSchema,
  type Dashboard,
  type DashboardAoi,
  type DashboardWidgetConfig,
  type ListDashboardsResponse,
} from "../schemas/api/dashboards/get";
import { PublishDashboardResponseSchema } from "../schemas/api/dashboards/patch-public";
import type { WidgetPositionPatch } from "@/app/lib/dashboard-widgets";
import { useErrorHandler } from "./useErrorHandler";
import { apiFetch } from "@/app/lib/api-client";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await apiFetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const errorWithStatus = new Error(
      error.error || `Request failed: ${res.statusText}`
    );
    (errorWithStatus as Error & { status?: number }).status = res.status;
    throw errorWithStatus;
  }

  return res;
}

export function useDashboardsList() {
  const { showApiError } = useErrorHandler();

  const { data, isLoading, error } = useQuery<ListDashboardsResponse>({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const res = await request("/api/dashboards");
      return ListDashboardsResponseSchema.parse(await res.json());
    },
  });

  useEffect(() => {
    if (error && (error as Error & { status?: number }).status !== 401) {
      showApiError(error, { title: "Unable to load dashboards" });
    }
  }, [error, showApiError]);

  return { dashboards: data, isLoading, error };
}

export function useDashboard(id: string) {
  const { data, isLoading, error } = useQuery<Dashboard>({
    queryKey: ["dashboard", id],
    queryFn: async () => {
      const res = await request(`/api/dashboards/${id}`);
      return DashboardSchema.parse(await res.json());
    },
    // Widgets can be silently deleted server-side (e.g. their insight was
    // deleted) — always refetch on navigation rather than trusting the cache.
    refetchOnMount: "always",
    retry: false,
    enabled: !!id,
  });

  return { dashboard: data, isLoading, error };
}

export function useRenameDashboard(id: string) {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: (body: { name?: string; description?: string }) =>
      request(`/api/dashboards/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
    onError: (error: Error) =>
      showApiError(error, { title: "Unable to rename dashboard" }),
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: (id: string) =>
      request(`/api/dashboards/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
    onError: (error: Error) =>
      showApiError(error, { title: "Unable to delete dashboard" }),
  });
}

export interface CreateDashboardBody {
  name?: string;
  description?: string;
  // Exactly one AOI in the MVP — the API rejects more.
  aois: Pick<DashboardAoi, "source" | "src_id" | "subtype" | "name">[];
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: async (body: CreateDashboardBody): Promise<Dashboard> => {
      const res = await request("/api/dashboards", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return DashboardSchema.parse(await res.json());
    },
    onSuccess: (dashboard) => {
      // Seed the detail cache so navigating to the new dashboard doesn't flash
      // a loading state.
      queryClient.setQueryData(["dashboard", dashboard.id], dashboard);
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
    onError: (error: Error) =>
      showApiError(error, { title: "Unable to create dashboard" }),
  });
}

export interface AddWidgetBody {
  widget_type: string;
  insight_id?: string;
  config?: DashboardWidgetConfig;
  position?: number;
}

export function useAddWidget(dashboardId: string) {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: (body: AddWidgetBody) =>
      request(`/api/dashboards/${dashboardId}/widgets`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      // POST returns the dashboard without insight expansion — refetch the
      // render endpoint instead of caching the response.
      queryClient.invalidateQueries({ queryKey: ["dashboard", dashboardId] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
    onError: (error: Error) =>
      showApiError(error, { title: "Unable to add widget" }),
  });
}

export function useUpdateWidget(dashboardId: string) {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: ({
      widgetId,
      ...body
    }: {
      widgetId: string;
      position?: number;
      // The backend replaces config wholesale (no merge) — callers must send
      // the full config, spreading the widget's existing one.
      config?: DashboardWidgetConfig;
    }) =>
      request(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", dashboardId] });
    },
    onError: (error: Error) =>
      showApiError(error, { title: "Unable to update widget" }),
  });
}

/**
 * Persists a drag-reorder as one position PATCH per moved widget (the API has
 * no bulk endpoint), applying the new order optimistically and rolling back
 * on failure. Build the patches with `computeReorder`.
 */
export function useReorderWidgets(dashboardId: string) {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: async (patches: WidgetPositionPatch[]) => {
      await Promise.all(
        patches.map(({ id, position }) =>
          request(`/api/dashboards/${dashboardId}/widgets/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ position }),
          })
        )
      );
    },
    onMutate: async (patches) => {
      await queryClient.cancelQueries({
        queryKey: ["dashboard", dashboardId],
      });
      const previous = queryClient.getQueryData<Dashboard>([
        "dashboard",
        dashboardId,
      ]);
      if (previous) {
        const positionById = new Map(
          patches.map(({ id, position }) => [id, position])
        );
        queryClient.setQueryData<Dashboard>(["dashboard", dashboardId], {
          ...previous,
          widgets: previous.widgets.map((widget) =>
            positionById.has(widget.id)
              ? { ...widget, position: positionById.get(widget.id)! }
              : widget
          ),
        });
      }
      return { previous };
    },
    onError: (error: Error, _patches, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["dashboard", dashboardId], context.previous);
      }
      showApiError(error, { title: "Unable to reorder widgets" });
    },
    // Refetch either way: on partial failure the rollback is stale, and on
    // success this heals races with concurrent agent-added widgets.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", dashboardId] });
    },
  });
}

export function usePublishDashboard(dashboardId: string) {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: async (isPublic: boolean) => {
      const res = await request(`/api/dashboards/${dashboardId}/public`, {
        method: "PATCH",
        body: JSON.stringify({ is_public: isPublic }),
      });
      return PublishDashboardResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", dashboardId] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      // Publishing cascades is_public to the referenced insights.
      queryClient.invalidateQueries({ queryKey: ["userInsights"] });
    },
    onError: (error: Error) =>
      showApiError(error, { title: "Unable to update sharing" }),
  });
}

export function useRemoveWidget(dashboardId: string) {
  const queryClient = useQueryClient();
  const { showApiError } = useErrorHandler();

  return useMutation({
    mutationFn: (widgetId: string) =>
      request(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", dashboardId] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
    onError: (error: Error) =>
      showApiError(error, { title: "Unable to remove widget" }),
  });
}
