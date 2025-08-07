import { NextResponse } from "next/server";
import { serialize } from "cookie";

const TOKEN_NAME = "auth_token";

export async function POST() {
  // Clear the auth token cookie by setting it to expire immediately
  const serialized = serialize(TOKEN_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  const response = NextResponse.json({ message: "Logged out successfully" });
  response.headers.set("Set-Cookie", serialized);

  return response;
}
