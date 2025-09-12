import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import {
  getAuthToken,
  getSessionToken,
  getAPIRequestHeaders,
} from "../../shared/utils";

const BASE_URL = API_CONFIG.API_BASE_URL;
const METHODS_WITH_BODY = ["POST", "PUT", "PATCH"];

/**
 * Builds the target URL for the proxy request and strips any trailing slash.
 * @param pathSegments - The path segments to append to the base URL.
 * @returns The target URL with the path segments and no trailing slash.
 */
function buildTargetUrl(pathSegments: string[]): string {
  const url = `${BASE_URL}/${pathSegments.join("/")}`;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Proxies the request to the upstream API.
 * @param method - The HTTP method to use.
 * @param url - The URL to proxy the request to.
 * @param token - The authentication token to use.
 * @param request - The request to proxy.
 * @returns The response from the upstream API.
 */
async function proxyRequest(
  method: string,
  url: string,
  token: string,
  request: NextRequest
): Promise<NextResponse> {
  const body = METHODS_WITH_BODY.includes(method)
    ? await request.text()
    : undefined;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(await getAPIRequestHeaders()),
    },
    body,
  });

  const responseText = await response.text();

  return new NextResponse(responseText, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Handles the proxy request.
 * @param request - The request to proxy.
 * @param params - The path segments to append to the base URL.
 * @returns The response from the upstream API.
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  try {
    const { path } = await params;
    let token = await getAuthToken();
    if (!token) {
      console.warn("No auth token found, using anonymous access");
      token = await getSessionToken();
    }

    const method = request.method.toUpperCase();
    const targetUrl = buildTargetUrl(path);

    return await proxyRequest(method, targetUrl, token, request);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
