/**
 * NDJSON fixtures for tests that drive chatStore through a mocked apiFetch:
 * a Response that streams lines like POST /api/chat or GET /api/threads/:id,
 * and the lines themselves. Shared by the chat store and front-door tests.
 */

/** A Response-like object that streams the given NDJSON lines, then ends. */
export function ndjsonResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  let delivered = false;
  const reader = {
    read: () => {
      if (delivered) {
        return Promise.resolve({ done: true, value: undefined });
      }
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

/** One NDJSON line for a plain assistant text turn. */
export function agentTextLine(text: string): string {
  return JSON.stringify({
    node: "agent",
    timestamp: "2026-07-30T00:00:01.000Z",
    update: JSON.stringify({
      messages: [
        {
          lc: 1,
          type: "constructor",
          id: ["x"],
          kwargs: {
            content: text,
            type: "ai",
            id: "m-ai",
            response_metadata: {},
            tool_calls: [],
            invalid_tool_calls: [],
          },
        },
      ],
    }),
  });
}

/** One NDJSON line for a replayed human turn (fetchThread only). */
export function humanLine(text: string): string {
  return JSON.stringify({
    node: "agent",
    timestamp: "2026-07-30T00:00:00.000Z",
    update: JSON.stringify({
      messages: [
        {
          lc: 1,
          type: "constructor",
          id: ["x"],
          kwargs: {
            content: text,
            type: "human",
            id: "m-human",
            response_metadata: {},
          },
        },
      ],
    }),
  });
}
