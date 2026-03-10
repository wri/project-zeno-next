import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import {
  getAuthToken,
  getSessionToken,
  getAPIRequestHeaders,
} from "@/app/api/shared/utils";

/**
 * Proxy for the area hierarchy endpoint.
 * GET /api/areas/{code}/children → upstream GET /api/areas/{code}/children
 *
 * Returns the parent area and its child sub-regions (GADM level-1, level-2, etc.).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    let token = await getAuthToken();
    if (!token) {
      token = await getSessionToken();
    }

    const upstream = `${API_CONFIG.SIDECAR_BASE_URL}/areas/${encodeURIComponent(code)}/children`;

    const response = await fetch(upstream, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Upstream error");
      return NextResponse.json({ error: text }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[areas/children] Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
