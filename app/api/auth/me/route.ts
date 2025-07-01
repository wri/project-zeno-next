import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";

const TOKEN_NAME = "auth_token";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;

  if (!token) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }

  try {
    const decoded: { email: string; exp: number } = jwtDecode(token);
    // Check if the token is expired
    if (decoded.exp * 1000 < Date.now()) {
      return NextResponse.json({ isAuthenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      isAuthenticated: true,
      user: { email: decoded.email },
    });
  } catch {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
