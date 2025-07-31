import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const TOKEN_NAME = "auth_token";
const BASE_URL = "https://api.zeno-staging.ds.io/api";

export async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await params;
    const urlPath = path.join("/");
    const targetUrl = `${BASE_URL}/${urlPath}`;

    const method = request.method.toUpperCase();
    const needsBody = ["POST", "PUT"].includes(method);
    const body = needsBody ? await request.text() : undefined;

    const proxyRes = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    const resText = await proxyRes.text();
    let json;

    try {
      json = JSON.parse(resText);
    } catch {
      json = { data: resText };
    }

    return NextResponse.json(json, { status: proxyRes.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
