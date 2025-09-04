import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { API_CONFIG } from "@/app/config/api";
import { getAPIRequestHeaders } from "../../shared/utils";

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

    // Attempt to fetch prompts usage/quota from upstream
    let promptsUsed: number | null = null;
    let promptQuota: number | null = null;

    try {
      const upstream = await fetch(`${API_CONFIG.API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(await getAPIRequestHeaders()),
        },
        cache: "no-store",
      });

      if (upstream.ok) {
        const data = await upstream.json();
        const used = data?.promptsUsed;
        const quota = data?.promptQuota;
        promptsUsed = typeof used === "number" ? used : null;
        promptQuota = typeof quota === "number" ? quota : null;
      }
    } catch {
      // Swallow upstream errors and fall back to nulls
    }

    return NextResponse.json({
      isAuthenticated: true,
      user: { email: decoded.email },
      promptsUsed,
      promptQuota,
    });
  } catch {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
