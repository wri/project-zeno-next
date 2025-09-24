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
    const decoded: Record<string, unknown> = jwtDecode(token) as Record<
      string,
      unknown
    >;
    // Check if the token is expired (if exp present)
    const exp = typeof decoded.exp === "number" ? decoded.exp : null;
    if (exp && exp * 1000 < Date.now()) {
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

    // fallbacks for email and id
    const root = decoded as Record<string, unknown>;
    const userObj =
      typeof root.user === "object" && root.user !== null
        ? (root.user as Record<string, unknown>)
        : undefined;

    const emailRoot =
      typeof root.email === "string" ? (root.email as string) : null;
    const emailUser =
      userObj && typeof userObj.email === "string"
        ? (userObj.email as string)
        : null;
    const email = emailRoot ?? emailUser ?? null;

    const idSub = typeof root.sub === "string" ? (root.sub as string) : null;
    const idRoot = typeof root.id === "string" ? (root.id as string) : null;
    const idUserId =
      typeof root.userId === "string" ? (root.userId as string) : null;
    const idFromUser =
      userObj && typeof userObj.id === "string" ? (userObj.id as string) : null;
    const userId = idSub ?? idRoot ?? idUserId ?? idFromUser ?? email;

    return NextResponse.json({
      isAuthenticated: true,
      user: { email, id: userId },
      promptsUsed,
      promptQuota,
      hasProfile,
    });
  } catch {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
