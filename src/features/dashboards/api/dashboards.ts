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
