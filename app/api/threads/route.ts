import { NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import {
  getAuthToken,
  getSessionToken,
  getAPIRequestHeaders,
} from "../shared/utils";

interface Thread {
  id: string;
  name: string;
  is_public?: boolean;
  [key: string]: unknown;
}

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
      const upstreamStatus = response.status;
      const mappedStatus = upstreamStatus >= 500 ? 500 : 400;
      return NextResponse.json(
        { error: "External API error", status: upstreamStatus },
        { status: mappedStatus }
      );
    }

    const json = (await response.json()) as Thread[];
    const threadsWithPublicFlag = json.map((thread) => ({
      ...thread,
      is_public: thread.is_public ?? false,
    }));
    return NextResponse.json(threadsWithPublicFlag, { status: 200 });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
