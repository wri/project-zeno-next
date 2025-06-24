import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

const TOKEN_NAME = "auth_token";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ message: "Token is required" }, { status: 400 });
  }

  const serialized = serialize(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: MAX_AGE,
    path: "/",
  });

  const response = NextResponse.json({ message: "Token set successfully" });
  response.headers.set("Set-Cookie", serialized);

  return response;
}
