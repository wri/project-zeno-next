import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";

export const TOKEN_NAME = "auth_token";
export const COOKIE_NAME = "session_token";

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_NAME)?.value || null;
}

export async function getSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  return `noauth:${cookieStore.get(COOKIE_NAME)?.value}`;
}

export async function getAPIRequestHeaders(): Promise<Record<string, string>> {
  return {
    "X-API-KEY": process.env.NEXT_SERVICE_API_KEY || "",
    "X-ZENO-FORWARDED-FOR": (await headers()).get("x-forwarded-for") || "",
  };
}

// Middleware-safe variants that read from the incoming request
export function getAuthTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(TOKEN_NAME)?.value || null;
}

export function getSessionTokenFromRequest(
  request: NextRequest
): string | null {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}
