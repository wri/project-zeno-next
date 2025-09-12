import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

const HAS_PROFILE_COOKIE = "has_profile";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic validation for required fields
    const { first_name, last_name, email } = body ?? {};

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // In a future iteration, persist the profile server-side.
    // For now, set a cookie that marks onboarding completion.
    const serialized = serialize(HAS_PROFILE_COOKIE, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: MAX_AGE,
      path: "/",
    });

    const response = NextResponse.json({ message: "Profile saved" });
    response.headers.set("Set-Cookie", serialized);
    return response;
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
