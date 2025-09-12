import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import { getAPIRequestHeaders, getAuthToken, getSessionToken } from "@/app/api/shared/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; checkpoint_id: string } }
) {
  try {
    const { id, checkpoint_id } = params;
    let token = await getAuthToken();
    if (!token) {
      token = await getSessionToken();
    }

    // Forward content-type for CSV/JSON
    const contentType = request.headers.get("content-type") || "text/csv";

    const url = `${API_CONFIG.ENDPOINTS.THREADS}/${id}/${checkpoint_id}/raw_data`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
    });

    // Forward status and headers, and stream the body
    if (!response.ok) {
      return NextResponse.json(
        { error: "Upstream API error", status: response.status },
        { status: response.status }
      );
    }
  
    const body = await response.text(); // for CSV or JSON

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        // Forward relevant headers (filename, etc.) if needed:
        ...(response.headers.get("Content-Disposition")
          ? { "Content-Disposition": response.headers.get("Content-Disposition")! }
          : {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}