import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, TOKEN_NAME } from "@/app/api/shared/utils";

const HAS_PROFILE_COOKIE = "has_profile";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;

  try {
    if (token) {
      await fetch("https://api.resourcewatch.org/auth/logout", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
    }
  } catch {
    // Ignore upstream errors; proceed to clear local auth regardless
  }

  const response = NextResponse.json({ message: "Logged out" });

  // Clear auth-related cookies
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
  // Session cookie is non-auth; clear to reset session as well
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });

  return response;
}
