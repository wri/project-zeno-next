import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, TOKEN_NAME } from "@/app/api/shared/utils";

const HAS_PROFILE_COOKIE = "has_profile";

export async function POST() {
  // Best-effort: read token (not strictly required for clearing our cookies)
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;

  // Optionally try RW logout with bearer (kept for parity, but not required)
  try {
    if (token) {
      await fetch("https://api.resourcewatch.org/auth/logout", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    }
  } catch {}

  const response = NextResponse.json({ message: "Logged out" });

  // Clear our cookies
  response.cookies.set(TOKEN_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(HAS_PROFILE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });

  return response;
}
