/** Low-level JSON fetch with retry/backoff (port of tracey's _request_json). */

export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function shortText(text: string, limit = 200): string {
  const clean = (text ?? "").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit)}…`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RequestJsonOptions {
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, string | number | undefined>;
  readonly retries?: number;
  readonly backoffMs?: number;
  readonly signal?: AbortSignal;
}

/**
 * GET a URL and return parsed JSON. Retries transient failures (network
 * errors, 429, 5xx) with exponential backoff; 401/403 and other 4xx raise
 * immediately with a clear message.
 */
export async function requestJson<T = unknown>(
  url: string,
  options: RequestJsonOptions = {}
): Promise<T> {
  const {
    headers = {},
    params,
    retries = 3,
    backoffMs = 1000,
    signal,
  } = options;

  const target = new URL(url);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      target.searchParams.set(key, String(value));
    }
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(target.toString(), { headers, signal });
    } catch (error) {
      if (signal?.aborted) throw new ApiError("Request cancelled");
      lastError = error instanceof Error ? error : new Error(String(error));
      await sleep(backoffMs * 2 ** attempt + Math.random() * 250);
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const body = shortText(await response.text().catch(() => ""));
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(
        `This endpoint needs a superuser token (HTTP ${response.status}: ${body})`,
        response.status
      );
    }
    if (
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 429
    ) {
      throw new ApiError(
        `Request failed (HTTP ${response.status}: ${body})`,
        response.status
      );
    }

    lastError = new ApiError(
      `Transient API error (HTTP ${response.status})`,
      response.status
    );
    await sleep(backoffMs * 2 ** attempt + Math.random() * 250);
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(
    `Request failed: ${lastError?.message ?? "unknown error"}`
  );
}
