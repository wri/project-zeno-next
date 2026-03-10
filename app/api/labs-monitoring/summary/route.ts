import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import {
  getAuthToken,
  getSessionToken,
  getAPIRequestHeaders,
} from "@/app/api/shared/utils";

/**
 * POST proxy for the labs monitoring summary endpoint.
 *
 * Forwards the JSON request body to the upstream
 * POST /api/labs/monitoring/summary endpoint and returns the response.
 */
export async function POST(request: NextRequest) {
  try {
    let token = await getAuthToken();
    if (!token) {
      console.warn(
        "[labs-monitoring-summary] No auth token found, using anonymous session",
      );
      token = await getSessionToken();
    }

    const body = await request.json();

    const upstream = `${API_CONFIG.SIDECAR_BASE_URL}/labs/monitoring/summary`;

    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(await getAPIRequestHeaders()),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Upstream error");
      return NextResponse.json({ error: text }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[labs-monitoring-summary] Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
