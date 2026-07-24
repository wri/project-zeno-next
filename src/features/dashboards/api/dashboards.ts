import {
  DashboardCreateRequestSchema,
  DashboardListResponseSchema,
  DashboardResponseSchema,
  type AoiSearchResult,
  type Dashboard,
  type DashboardCreateRequest,
} from "./schemas";
import { readJson } from "./http";
import { apiFetch } from "@/app/lib/api-client";
import { aoiToDashboardCreateRequest } from "../lib/aoi";

export async function listDashboards(): Promise<Dashboard[]> {
  const data = await readJson<unknown>("/api/dashboards", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return DashboardListResponseSchema.parse(data);
}

export async function getDashboard(id: string): Promise<Dashboard> {
  const data = await readJson<unknown>(`/api/dashboards/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return DashboardResponseSchema.parse(data);
}

export async function createDashboard(
  payload: DashboardCreateRequest
): Promise<Dashboard> {
  const body = DashboardCreateRequestSchema.parse(payload);
  const data = await readJson<unknown>("/api/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return DashboardResponseSchema.parse(data);
}

export function createDashboardPayloadFromAoi(
  aoi: AoiSearchResult
): DashboardCreateRequest {
  return aoiToDashboardCreateRequest(aoi);
}

// The PATCH response comes back without insight expansion, so callers must
// not write it into the detail cache — invalidate and refetch instead.
export async function renameDashboard(
  dashboardId: string,
  name: string
): Promise<void> {
  await readJson<unknown>(`/api/dashboards/${dashboardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function deleteDashboard(dashboardId: string): Promise<void> {
  // 204 No Content — bypass readJson, which would choke on the empty body.
  const res = await apiFetch(`/api/dashboards/${dashboardId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = new Error(`Failed to delete dashboard: ${res.statusText}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
}

export interface WidgetUpdate {
  position?: number;
  // Replaced whole by the backend (not merged) — always send the full config.
  config?: Record<string, unknown>;
}

// The PATCH response is the dashboard without insight expansion — callers
// invalidate and refetch the detail endpoint to render, so it is ignored.
export async function updateWidget(
  dashboardId: string,
  widgetId: string,
  patch: WidgetUpdate
): Promise<void> {
  await readJson<unknown>(
    `/api/dashboards/${dashboardId}/widgets/${widgetId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
}

// Adds a persisted insight to a dashboard (the chat-side "Add to dashboard"
// toggle). The backend is idempotent for duplicate insight adds and returns
// the dashboard without insight expansion — callers invalidate and refetch.
export async function addInsightWidget(
  dashboardId: string,
  insightId: string,
  config?: Record<string, unknown>
): Promise<void> {
  await readJson<unknown>(`/api/dashboards/${dashboardId}/widgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      widget_type: "insight",
      insight_id: insightId,
      // A chart subset (config.chartIds) rides along when the pane adds a single
      // chart; omitted for a whole-insight add so the widget shows all charts.
      ...(config ? { config } : {}),
    }),
  });
}

export async function deleteWidget(
  dashboardId: string,
  widgetId: string
): Promise<void> {
  // 204 No Content — bypass readJson, which would choke on the empty body.
  const res = await apiFetch(
    `/api/dashboards/${dashboardId}/widgets/${widgetId}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const error = new Error(`Failed to remove widget: ${res.statusText}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
}
