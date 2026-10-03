/**
 * A Response-like object that streams the given NDJSON lines in one chunk,
 * then reports the stream as done — what `apiFetch` resolves to for a
 * `/api/chat` stream in tests.
 */
export function ndjsonResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  let delivered = false;
  const reader = {
    read: () => {
      if (delivered) return Promise.resolve({ done: true, value: undefined });
      delivered = true;
      return Promise.resolve({
        done: false,
        value: encoder.encode(lines.join("\n") + "\n"),
      });
    },
    releaseLock: () => {},
    cancel: () => Promise.resolve(),
  };
  return {
    ok: true,
    headers: new Headers(),
    body: { getReader: () => reader },
  } as unknown as Response;
}
