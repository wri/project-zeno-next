import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import {
  getAPIRequestHeaders,
  getAuthToken,
  getSessionToken,
} from "@/app/api/shared/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    let token = await getAuthToken();
    if (!token) {
      console.warn("No auth token found, using anonymous access");
      token = await getSessionToken();
    }

    const bodyText = await request.text();

    const response = await fetch(
      `${API_CONFIG.ENDPOINTS.THREADS}/${id}/rating`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(await getAPIRequestHeaders()),
        },
        body: bodyText,
      }
    );

    const responseText = await response.text();
    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Error in rating POST:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
