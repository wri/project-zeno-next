import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const TOKEN_NAME = "auth_token";
const BASE_URL = "https://api.zeno-staging.ds.io/api";
const METHODS_WITH_BODY = ["POST", "PUT"];

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_NAME)?.value || null;
}

/**
 * Builds the target URL for the proxy request. The upstream API expects
 * a trailing slash.
 * @param pathSegments - The path segments to append to the base URL.
 * @returns The target URL with the path segments.
 */
function buildTargetUrl(pathSegments: string[]): string {
  const url = `${BASE_URL}/${pathSegments.join("/")}`;
  return url.endsWith("/") ? url : `${url}/`;
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
export async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const method = request.method.toUpperCase();
    const resolvedParams = await params;
    const targetUrl = buildTargetUrl(resolvedParams.path);

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
