/**
 * The Welcome screen sits between sign-in and /app, so it must pass the query
 * string through untouched: `?prompt=` is what makes the person's question
 * run as soon as they arrive (see useAuthGuard and the chat page).
 */

/** The question waiting to run, or null when there isn't one. */
export function pendingPrompt(search: string): string | null {
  const prompt = new URLSearchParams(search).get("prompt")?.trim();
  return prompt ? prompt : null;
}

/** Where "Continue" goes: /app with the original query string. */
export function continueUrl(search: string): string {
  const query = new URLSearchParams(search).toString();
  return query ? `/app?${query}` : "/app";
}
