import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { API_CONFIG } from "@/app/config/api";
import { getAPIRequestHeaders } from "../../shared/utils";

const TOKEN_NAME = "auth_token";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  let hasProfile = false;

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

      // Propagate unauthorized (for guards/clients to react)
      if (upstream.status === 401 || upstream.status === 403) {
        return NextResponse.json(
          { isAuthenticated: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      // For other upstream errors, surface an error payload for toasts
      if (!upstream.ok) {
        let text = "Upstream error";
        try {
          const bodyText = await upstream.text();
          text = bodyText || text;
        } catch {
          // ignore
        }
        return NextResponse.json({ error: text }, { status: upstream.status });
      }

      // OK path
      const data = await upstream.json();
      const used = data?.promptsUsed;
      const quota = data?.promptQuota;
      promptsUsed = typeof used === "number" ? used : null;
      promptQuota = typeof quota === "number" ? quota : null;
      hasProfile = Boolean(data?.hasProfile ?? data?.user?.hasProfile);
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error)?.message || "Internal error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isAuthenticated: true,
      user: { email: decoded.email },
      promptsUsed,
      promptQuota,
      hasProfile,
    });
  } catch {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
