import { apiFetch } from "@/app/lib/api-client";

export async function readJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(path, init);

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.error;
    } catch {}
    const error = new Error(detail || `Request failed: ${res.statusText}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}
