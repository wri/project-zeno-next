/**
 * The Welcome screen sits between sign-in and /app and passes the query
 * string through untouched: `?prompt=` is what makes the person's question
 * run as soon as they arrive (see useAuthGuard and the chat page).
 */

/** The question waiting to run, or null when there isn't one. */
export function pendingPrompt(search: string): string | null {
  const prompt = new URLSearchParams(search).get("prompt")?.trim();
  return prompt ? prompt : null;
}
