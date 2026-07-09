import {
  DashboardCreateRequestSchema,
  DashboardListResponseSchema,
  DashboardResponseSchema,
  type AoiSearchResult,
  type Dashboard,
  type DashboardCreateRequest,
} from "./schemas";
import { readJson } from "./http";
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
