import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME } from "./app/api/shared/utils";

// Set a session token if not set.
// This is not to identify the user, but to identify the session.

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);

  if (!cookie) {
    // The crypto module is not available in the middleware. Generate a random
    // token using a simple method.
    const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const token = Array.from(
      { length: 64 },
      () => c[Math.floor(Math.random() * c.length)]
    ).join("");


    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, token, { maxAge: MAX_AGE });
    return response;
  }
}
