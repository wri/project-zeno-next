import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  DashboardSchema,
  ListDashboardsResponseSchema,
  type Dashboard,
  type ListDashboardsResponse,
} from "../schemas/api/dashboards/get";
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
