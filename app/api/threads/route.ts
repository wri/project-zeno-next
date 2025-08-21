import { NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import {
  getAuthToken,
  getSessionToken,
  getAPIRequestHeaders,
} from "../shared/utils";

export async function GET() {
  try {
    let token = await getAuthToken();

    if (!token) {
      console.warn("No auth token found, using anonymous access");
      token = await getSessionToken();
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(API_CONFIG.ENDPOINTS.THREADS, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
    });

    if (!response.ok) {
      console.error(response);
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const json = await response.json();
    return NextResponse.json(json, { status: 200 });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
