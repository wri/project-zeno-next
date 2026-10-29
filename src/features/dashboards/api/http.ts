import { apiFetch } from "@/app/lib/api-client";

export async function readJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(path, init);

  if (!res.ok) {
    // Only a string is a message: FastAPI's validation 422 carries a list.
    let detail: string | undefined;
    try {
      const body = await res.json();
      const candidate = body?.detail ?? body?.error;
      if (typeof candidate === "string") detail = candidate;
    } catch {}
    throw Object.assign(
      new Error(detail || `Request failed: ${res.statusText}`),
      { status: res.status, detail }
    );
  }

  return res.json() as Promise<T>;
}

/** The HTTP status an error thrown by `readJson` carries, if any. */
export function httpStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/** The backend's string `detail` on an error thrown by `readJson`, if any. */
export function httpDetail(error: unknown): string | undefined {
  const detail = (error as { detail?: unknown } | null)?.detail;
  return typeof detail === "string" && detail.trim() ? detail : undefined;
}
