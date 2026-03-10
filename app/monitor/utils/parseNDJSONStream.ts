import type { StreamEvent } from "../types/stream";

/**
 * Reads an NDJSON stream line-by-line and invokes `onEvent` for each
 * successfully parsed JSON object.
 *
 * - Parse errors on individual lines are logged and skipped (the stream
 *   continues).
 * - The function resolves when the stream ends naturally.
 * - If `signal` is provided and aborted, reading stops at the next chunk
 *   boundary and the function resolves normally (no throw).
 * - Network / reader errors propagate as rejections.
 */
export async function parseNDJSONStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on newlines — the last element may be an incomplete line
      const lines = buffer.split("\n");
      buffer = lines.pop()!; // keep the trailing incomplete fragment

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const event = JSON.parse(trimmed) as StreamEvent;
          onEvent(event);
        } catch {
          console.warn("[parseNDJSONStream] Failed to parse line:", trimmed);
        }
      }
    }

    // Flush any remaining content in the buffer
    const trailing = buffer.trim();
    if (trailing) {
      try {
        const event = JSON.parse(trailing) as StreamEvent;
        onEvent(event);
      } catch {
        // Ignore trailing partial line — stream ended mid-write
      }
    }
  } finally {
    // Always release the reader lock
    try {
      reader.cancel();
    } catch {
      // Already closed / cancelled — safe to ignore
    }
  }
}
