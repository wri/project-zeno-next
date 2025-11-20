import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { API_CONFIG } from "@/app/config/api";
import { getAPIRequestHeaders, getAuthToken, getMachineUserToken } from "../../shared/utils";

export async function GET() {
  const token = await getAuthToken();
  let hasProfile = false;

  if (!token) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }

  // Check if this is a machine user token
  const isMachineToken = getMachineUserToken() === token;

  try {
    // Try to decode JWT - machine tokens might not be JWTs
    let decoded: Record<string, unknown> | null = null;
    try {
      decoded = jwtDecode(token) as Record<string, unknown>;
      // Check if the token is expired (if exp present)
      const exp = typeof decoded.exp === "number" ? decoded.exp : null;
      if (exp && exp * 1000 < Date.now()) {
        return NextResponse.json({ isAuthenticated: false }, { status: 401 });
      }
    } catch (decodeError) {
      // If it's a machine token and not a JWT, that's okay - we'll still use it for API calls
      if (!isMachineToken) {
        throw decodeError;
      }
      // For machine tokens that aren't JWTs, we'll skip JWT decoding
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

    // Extract user info from JWT if available
    let email: string | null = null;
    let userId: string | null = null;

    if (decoded) {
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
      email = emailRoot ?? emailUser ?? null;

      const idSub = typeof root.sub === "string" ? (root.sub as string) : null;
      const idRoot = typeof root.id === "string" ? (root.id as string) : null;
      const idUserId =
        typeof root.userId === "string" ? (root.userId as string) : null;
      const idFromUser =
        userObj && typeof userObj.id === "string" ? (userObj.id as string) : null;
      userId = idSub ?? idRoot ?? idUserId ?? idFromUser ?? email;
    } else if (isMachineToken) {
      // For machine tokens, use a default identifier
      userId = "machine_user";
      email = "machine@system";
    }

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
