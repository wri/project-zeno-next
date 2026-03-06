import { NextRequest, NextResponse } from "next/server";
import { API_CONFIG } from "@/app/config/api";
import {
  getAuthToken,
  getSessionToken,
  getAPIRequestHeaders,
} from "@/app/api/shared/utils";

/**
 * Streaming proxy for the labs monitoring endpoint.
 *
 * Unlike the generic proxy in /api/proxy/[...path] (which buffers the full
 * response body), this route pipes the upstream NDJSON stream directly to the
 * client so events can be processed progressively.
 */
export async function GET(request: NextRequest) {
  try {
    let token = await getAuthToken();
    if (!token) {
      console.warn(
        "[labs-monitoring] No auth token found, using anonymous session",
      );
      token = await getSessionToken();
    }

    // Forward all query params to upstream
    const { searchParams } = request.nextUrl;
    const upstream = new URL(
      `${API_CONFIG.SIDECAR_BASE_URL}/labs/monitoring/stream`,
    );
    searchParams.forEach((value, key) => {
      upstream.searchParams.append(key, value);
    });

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 300_000); // 5 minutes

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(await getAPIRequestHeaders()),
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      const text = await response.text().catch(() => "Upstream error");
      return NextResponse.json({ error: text }, { status: response.status });
    }

    if (!response.body) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "No response body from upstream" },
        { status: 502 },
      );
    }

    // Pipe the upstream readable stream straight through
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            console.error("[labs-monitoring] Stream read error:", err);
            controller.error(err);
          }
        } finally {
          clearTimeout(timeoutId);
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[labs-monitoring] Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
