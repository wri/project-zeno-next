import { sendGAEvent } from "@next/third-parties/google";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a GA4 event and waits for confirmation before resolving.
 * Uses event_callback for reliable delivery, especially before navigation.
 * Falls back to sendGAEvent with a small delay if gtag is unavailable.
 *
 * @param eventName - The name of the GA4 event
 * @param params - Event parameters to send
 * @param timeoutMs - Maximum time to wait for callback (default 2000ms)
 */
export async function sendGAEventAsync(
  eventName: string,
  params: Record<string, unknown>,
  timeoutMs = 2000
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, {
        ...params,
        event_callback: () => resolve(),
        event_timeout: timeoutMs,
      });
    } else {
      // Fallback: use standard sendGAEvent with small delay
      sendGAEvent("event", eventName, params);
      setTimeout(resolve, 150);
    }
  });
}
